"""Fill the App Store listing for the iOS app and, with STEP=submit, send it to App Review.

Idempotent: safe to run again. Texts come from listing.json, screenshots from
screens/<locale>/N.png (iPhone 6.9", 1320x2868). Run by
.github/workflows/ios-listing.yml with the App Store Connect API key.
"""
import hashlib, json, os, sys
from asc_api import call, rel, all_pages, upload_parts, BUNDLE

HERE = os.path.dirname(__file__)
VERSION = os.environ.get('APP_VERSION', '1.0.20')
BUILD = os.environ.get('APP_BUILD', '11')
STEP = open(os.path.join(HERE, 'step')).read().strip() if os.path.exists(os.path.join(HERE, 'step')) else 'listing'
TEXTS = json.load(open(os.path.join(HERE, 'listing.json')))
EU = 'AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE'.split()
NOTES = """RoboTrainer is a free self-check of breath-hold endurance: three breath holds (after an inhale, after a full exhale, after 20 squats). No account or login is needed.
After the test result the app offers a free 4-minute exercise (three exhale holds with 30-second rests, then a control inhale hold). Its result screen shows the optional auto-renewable subscription "Level 1" (level1_year, $3.99 per year), with price, renewal terms, Restore purchases, Manage subscription, Privacy Policy and Terms of Use links.
It is not a medical device and makes no diagnosis or treatment claims. Before the test the app shows a safety screen (contraindications, never hold breath in water or while driving, stop if dizzy) that the user must confirm.
Results are stored only on the device. Sending results by email is optional and requires a consent checkbox."""

app_id = call('GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data'][0]['id']
print('app', app_id)

# Content rights
call('PATCH', f'/v1/apps/{app_id}', {'data': {'type': 'apps', 'id': app_id,
     'attributes': {'contentRightsDeclaration': 'DOES_NOT_USE_THIRD_PARTY_CONTENT'}}})

# App info: category, name, subtitle, privacy URL, age rating
infos = call('GET', f'/v1/apps/{app_id}/appInfos')['data']
info = next(i for i in infos if i['attributes'].get('appStoreState') not in ('READY_FOR_SALE', 'READY_FOR_DISTRIBUTION')) if len(infos) > 1 else infos[0]
call('PATCH', f'/v1/appInfos/{info["id"]}', {'data': {'type': 'appInfos', 'id': info['id'],
     'relationships': {'primaryCategory': rel('appCategories', 'HEALTH_AND_FITNESS')}}})
have = {l['attributes']['locale']: l['id'] for l in call('GET', f'/v1/appInfos/{info["id"]}/appInfoLocalizations')['data']}
for loc, t in TEXTS.items():
    attrs = {'name': t['name'], 'subtitle': t['subtitle'], 'privacyPolicyUrl': t['privacyPolicyUrl']}
    if loc in have:
        call('PATCH', f'/v1/appInfoLocalizations/{have[loc]}', {'data': {'type': 'appInfoLocalizations', 'id': have[loc], 'attributes': attrs}})
    else:
        call('POST', '/v1/appInfoLocalizations', {'data': {'type': 'appInfoLocalizations', 'attributes': dict(attrs, locale=loc),
             'relationships': {'appInfo': rel('appInfos', info['id'])}}})
print('app info ok')

age = call('GET', f'/v1/appInfos/{info["id"]}/ageRatingDeclaration')['data']
NONE = 'NONE'
age_attrs = {
    'alcoholTobaccoOrDrugUseOrReferences': NONE, 'contests': NONE, 'gamblingSimulated': NONE,
    'horrorOrFearThemes': NONE, 'matureOrSuggestiveThemes': NONE, 'medicalOrTreatmentInformation': NONE,
    'profanityOrCrudeHumor': NONE, 'sexualContentGraphicAndNudity': NONE, 'sexualContentOrNudity': NONE,
    'violenceCartoonOrFantasy': NONE, 'violenceRealistic': NONE, 'violenceRealisticProlongedGraphicOrSadistic': NONE,
    'gunsOrOtherWeapons': NONE,
    'gambling': False, 'lootBox': False, 'unrestrictedWebAccess': False, 'messagingAndChat': False,
    'userGeneratedContent': False, 'advertising': False, 'parentalControls': False, 'ageAssurance': False,
    'healthOrWellnessTopics': True,
}
for k in list(age_attrs):
    if k not in age['attributes']:
        del age_attrs[k]
call('PATCH', f'/v1/ageRatingDeclarations/{age["id"]}', {'data': {'type': 'ageRatingDeclarations', 'id': age['id'], 'attributes': age_attrs}})
print('age rating ok')

# Price: free
# A schedule object can exist with no prices in it, so always (re)post the free price
if True:
    free = next(p for p in all_pages(f'/v1/apps/{app_id}/appPricePoints?filter[territory]=USA&limit=200')
                if float(p['attributes']['customerPrice']) == 0)
    call('POST', '/v1/appPriceSchedules', {'data': {'type': 'appPriceSchedules', 'relationships': {
        'app': rel('apps', app_id), 'baseTerritory': rel('territories', 'USA'),
        'manualPrices': {'data': [{'type': 'appPrices', 'id': '${p0}'}]}}},
        'included': [{'type': 'appPrices', 'id': '${p0}', 'attributes': {'startDate': None},
                      'relationships': {'appPricePoint': rel('appPricePoints', free['id'])}}]})
print('price ok')

# Availability: everywhere except the EU (no DSA trader status)
avail = call('GET', f'/v1/apps/{app_id}/appAvailabilityV2', ok_missing=True)
if not (avail and avail.get('data')):
    terr = [t['id'] for t in all_pages('/v1/territories?limit=200')]
    call('POST', '/v2/appAvailabilities', {'data': {'type': 'appAvailabilities', 'attributes': {'availableInNewTerritories': False},
         'relationships': {'app': rel('apps', app_id), 'territoryAvailabilities': {'data': [
             {'type': 'territoryAvailabilities', 'id': '${' + t + '}'} for t in terr]}}},
         'included': [{'type': 'territoryAvailabilities', 'id': '${' + t + '}', 'attributes': {'available': t not in EU},
                       'relationships': {'territory': rel('territories', t)}} for t in terr]})
print('availability ok')

# Version + build
vers = call('GET', f'/v1/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=10')['data']
ver = next((v for v in vers if v['attributes']['appStoreState'] in
            ('PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED')), None)
if ver is None:
    ver = call('POST', '/v1/appStoreVersions', {'data': {'type': 'appStoreVersions',
          'attributes': {'platform': 'IOS', 'versionString': VERSION},
          'relationships': {'app': rel('apps', app_id)}}})['data']
vid = ver['id']
call('PATCH', f'/v1/appStoreVersions/{vid}', {'data': {'type': 'appStoreVersions', 'id': vid, 'attributes': {
     'versionString': VERSION, 'copyright': '2026 American Business Trust.Corp', 'releaseType': 'AFTER_APPROVAL'}}})
builds = call('GET', f'/v1/builds?filter[app]={app_id}&filter[version]={BUILD}&filter[preReleaseVersion.version]={VERSION}')['data']
if not builds:
    sys.exit(f'build {VERSION} ({BUILD}) not found')
call('PATCH', f'/v1/appStoreVersions/{vid}/relationships/build', {'data': {'type': 'builds', 'id': builds[0]['id']}})
print('version', vid, VERSION, 'build', builds[0]['id'])

# Version texts + screenshots
have = {l['attributes']['locale']: l['id'] for l in call('GET', f'/v1/appStoreVersions/{vid}/appStoreVersionLocalizations')['data']}
for loc, t in TEXTS.items():
    attrs = {k: t[k] for k in ('description', 'keywords', 'promotionalText', 'supportUrl', 'marketingUrl')}
    if loc in have:
        call('PATCH', f'/v1/appStoreVersionLocalizations/{have[loc]}', {'data': {'type': 'appStoreVersionLocalizations', 'id': have[loc], 'attributes': attrs}})
        lid = have[loc]
    else:
        lid = call('POST', '/v1/appStoreVersionLocalizations', {'data': {'type': 'appStoreVersionLocalizations',
              'attributes': dict(attrs, locale=loc), 'relationships': {'appStoreVersion': rel('appStoreVersions', vid)}}})['data']['id']
    shots_dir = os.path.join(HERE, 'screens', loc)
    files = sorted(f for f in os.listdir(shots_dir) if f.endswith('.png')) if os.path.isdir(shots_dir) else []
    if not files:
        print('no screenshots for', loc)
        continue
    sets = call('GET', f'/v1/appStoreVersionLocalizations/{lid}/appScreenshotSets')['data']
    sset = next((s for s in sets if s['attributes']['screenshotDisplayType'] == 'APP_IPHONE_67'), None)
    if sset is None:
        sset = call('POST', '/v1/appScreenshotSets', {'data': {'type': 'appScreenshotSets',
                'attributes': {'screenshotDisplayType': 'APP_IPHONE_67'},
                'relationships': {'appStoreVersionLocalization': rel('appStoreVersionLocalizations', lid)}}})['data']
    for old in call('GET', f'/v1/appScreenshotSets/{sset["id"]}/appScreenshots')['data']:
        call('DELETE', f'/v1/appScreenshots/{old["id"]}')
    for f in files:
        blob = open(os.path.join(shots_dir, f), 'rb').read()
        r = call('POST', '/v1/appScreenshots', {'data': {'type': 'appScreenshots',
             'attributes': {'fileName': f, 'fileSize': len(blob)},
             'relationships': {'appScreenshotSet': rel('appScreenshotSets', sset['id'])}}})['data']
        upload_parts(r['attributes']['uploadOperations'], blob)
        call('PATCH', f'/v1/appScreenshots/{r["id"]}', {'data': {'type': 'appScreenshots', 'id': r['id'],
             'attributes': {'uploaded': True, 'sourceFileChecksum': hashlib.md5(blob).hexdigest()}}})
    print('screenshots', loc, len(files))
print('localizations ok')

# Review details (contact phone is typed by Nov in App Store Connect)
rd = call('GET', f'/v1/appStoreVersions/{vid}/appStoreReviewDetail', ok_missing=True)
rd_attrs = {'contactFirstName': 'Konstantin', 'contactLastName': 'Novikov', 'contactEmail': 'nkvclub@gmail.com',
            'demoAccountRequired': False, 'notes': NOTES}
if rd and rd.get('data'):
    print('review contact phone set:', bool(rd['data']['attributes'].get('contactPhone')))
    if STEP == 'submit' and not rd['data']['attributes'].get('contactPhone'):
        print('REVIEW PHONE MISSING'); sys.exit(1)
    call('PATCH', f'/v1/appStoreReviewDetails/{rd["data"]["id"]}', {'data': {'type': 'appStoreReviewDetails', 'id': rd['data']['id'], 'attributes': rd_attrs}})
elif os.environ.get('ASC_CONTACT_PHONE'):
    call('POST', '/v1/appStoreReviewDetails', {'data': {'type': 'appStoreReviewDetails',
         'attributes': dict(rd_attrs, contactPhone=os.environ['ASC_CONTACT_PHONE']),
         'relationships': {'appStoreVersion': rel('appStoreVersions', vid)}}}, ok_conflict=True)
else:
    print('REVIEW DETAILS MISSING: contact phone must be typed in App Store Connect (App Review Information)')
    if STEP == 'submit':
        sys.exit(1)
print('review details step done')

if STEP != 'submit':
    print('STEP', STEP, '- not submitting')
    sys.exit(0)

# Submit: the version goes into a review submission first; the first subscription
# must be submitted while that version is in it, then the submission is sent.
open_subs = [r for r in call('GET', f'/v1/reviewSubmissions?filter[app]={app_id}&filter[platform]=IOS')['data']
             if r['attributes']['state'] in ('READY_FOR_REVIEW',)]
sub = open_subs[0] if open_subs else call('POST', '/v1/reviewSubmissions', {'data': {'type': 'reviewSubmissions',
      'attributes': {'platform': 'IOS'}, 'relationships': {'app': rel('apps', app_id)}}})['data']
call('POST', '/v1/reviewSubmissionItems', {'data': {'type': 'reviewSubmissionItems', 'relationships': {
     'reviewSubmission': rel('reviewSubmissions', sub['id']), 'appStoreVersion': rel('appStoreVersions', vid)}}}, ok_conflict=True)
print('version added to review submission', sub['id'])
groups = call('GET', f'/v1/apps/{app_id}/subscriptionGroups?include=subscriptions')
for s in groups.get('included', []):
    if s['type'] == 'subscriptions' and s['attributes']['state'] == 'READY_TO_SUBMIT':
        call('POST', '/v1/subscriptionSubmissions', {'data': {'type': 'subscriptionSubmissions',
             'relationships': {'subscription': rel('subscriptions', s['id'])}}})
        print('subscription submitted', s['attributes']['productId'])
call('PATCH', f'/v1/reviewSubmissions/{sub["id"]}', {'data': {'type': 'reviewSubmissions', 'id': sub['id'], 'attributes': {'submitted': True}}})
print('SUBMITTED for review', sub['id'])
