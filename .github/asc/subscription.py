"""Create the «Level 1» yearly subscription in App Store Connect (idempotent).

Product level1_year, group «Level 1», 1 year, $3.99 in the US and Apple's
equalized prices elsewhere, en-US and ru localizations, review screenshot.
Run by .github/workflows/ios-subscription.yml with the App Store Connect API key.
"""
import hashlib, os, sys
from asc_api import call, rel, all_pages, upload_parts, BUNDLE

PRODUCT = 'level1_year'
USD = '3.99'
SHOT = os.path.join(os.path.dirname(__file__), 'review.png')
LOC = {
    'en-US': ('Level 1', 'A year of Level 1 breath training, stats and charts'),
    'ru': ('Уровень 1', 'Год тренировок Уровня 1, статистика и графики'),
}


app = call('GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data']
if not app:
    sys.exit('App record not found')
app_id = app[0]['id']
print('app', app_id)

# Group
groups = call('GET', f'/v1/apps/{app_id}/subscriptionGroups?include=subscriptions&limit=50')
group = next((g for g in groups['data'] if g['attributes']['referenceName'] == 'Level 1'), None)
if group is None:
    group = call('POST', '/v1/subscriptionGroups', {'data': {
        'type': 'subscriptionGroups', 'attributes': {'referenceName': 'Level 1'},
        'relationships': {'app': rel('apps', app_id)}}})['data']
    for loc, (name, _) in LOC.items():
        call('POST', '/v1/subscriptionGroupLocalizations', {'data': {
            'type': 'subscriptionGroupLocalizations', 'attributes': {'locale': loc, 'name': 'RoboTrainer'},
            'relationships': {'subscriptionGroup': rel('subscriptionGroups', group['id'])}}})
print('group', group['id'])

# Subscription
subs = call('GET', f'/v1/subscriptionGroups/{group["id"]}/subscriptions')['data']
sub = next((s for s in subs if s['attributes']['productId'] == PRODUCT), None)
if sub is None:
    sub = call('POST', '/v1/subscriptions', {'data': {
        'type': 'subscriptions',
        'attributes': {'name': 'Level 1 yearly', 'productId': PRODUCT, 'subscriptionPeriod': 'ONE_YEAR',
                       'familySharable': False, 'groupLevel': 1},
        'relationships': {'group': rel('subscriptionGroups', group['id'])}}})['data']
sid = sub['id']
print('subscription', sid, sub['attributes'].get('state'))

# Localizations
have = {l['attributes']['locale'] for l in call('GET', f'/v1/subscriptions/{sid}/subscriptionLocalizations')['data']}
for loc, (name, desc) in LOC.items():
    if loc not in have:
        call('POST', '/v1/subscriptionLocalizations', {'data': {
            'type': 'subscriptionLocalizations', 'attributes': {'locale': loc, 'name': name, 'description': desc},
            'relationships': {'subscription': rel('subscriptions', sid)}}})
print('localizations ok')

# Availability: every territory
terr = [t['id'] for t in all_pages('/v1/territories?limit=200')]
call('POST', '/v1/subscriptionAvailabilities', {'data': {
    'type': 'subscriptionAvailabilities', 'attributes': {'availableInNewTerritories': True},
    'relationships': {'subscription': rel('subscriptions', sid),
                      'availableTerritories': {'data': [{'type': 'territories', 'id': t} for t in terr]}}}},
     ok_conflict=True)
print('availability', len(terr), 'territories')

# Prices: $3.99 in the US, Apple's equalized price in every other territory
existing = call('GET', f'/v1/subscriptions/{sid}/prices?include=territory&limit=200')
priced = {p['relationships']['territory']['data']['id'] for p in existing['data']}
pp = all_pages(f'/v1/subscriptions/{sid}/pricePoints?filter[territory]=USA&limit=200')
us = next(p for p in pp if p['attributes']['customerPrice'] == USD)
points = [(('USA'), us['id'])]
for e in all_pages(f'/v1/subscriptionPricePoints/{us["id"]}/equalizations?include=territory&limit=200'):
    points.append((e['relationships']['territory']['data']['id'], e['id']))
added = 0
for t, pid in points:
    if t in priced:
        continue
    call('POST', '/v1/subscriptionPrices', {'data': {
        'type': 'subscriptionPrices', 'attributes': {'preserveCurrentPrice': False},
        'relationships': {'subscription': rel('subscriptions', sid),
                          'subscriptionPricePoint': rel('subscriptionPricePoints', pid),
                          'territory': rel('territories', t)}}}, ok_conflict=True)
    added += 1
print('prices added', added, 'of', len(points))

# Review screenshot
shot = call('GET', f'/v1/subscriptions/{sid}/appStoreReviewScreenshot')
if not shot.get('data'):
    blob = open(SHOT, 'rb').read()
    r = call('POST', '/v1/subscriptionAppStoreReviewScreenshots', {'data': {
        'type': 'subscriptionAppStoreReviewScreenshots',
        'attributes': {'fileName': 'review.png', 'fileSize': len(blob)},
        'relationships': {'subscription': rel('subscriptions', sid)}}})['data']
    upload_parts(r['attributes']['uploadOperations'], blob)
    call('PATCH', f'/v1/subscriptionAppStoreReviewScreenshots/{r["id"]}', {'data': {
        'type': 'subscriptionAppStoreReviewScreenshots', 'id': r['id'],
        'attributes': {'uploaded': True, 'sourceFileChecksum': hashlib.md5(blob).hexdigest()}}})
print('screenshot ok')

state = call('GET', f'/v1/subscriptions/{sid}')['data']['attributes']['state']
print('STATE', state)
shot = call('GET', f'/v1/subscriptions/{sid}/appStoreReviewScreenshot').get('data') or {}
print('screenshot state', (shot.get('attributes') or {}).get('assetDeliveryState'))
print('group locales', [l['attributes'] for l in call('GET', f'/v1/subscriptionGroups/{group["id"]}/subscriptionGroupLocalizations')['data']])
print('sub locales', [(l['attributes']['locale'], l['attributes'].get('state')) for l in call('GET', f'/v1/subscriptions/{sid}/subscriptionLocalizations')['data']])
