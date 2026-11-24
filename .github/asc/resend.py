"""Send the rejected review submission (UNRESOLVED_ISSUES) back to App Review (Nov 2026-11-24).
First adds the steps to find the subscription to the App Review notes (Guideline 2.1(b)),
then PATCH submitted=true on that submission, then prints the new states."""

from asc_api import call, BUNDLE

STEPS = """
HOW TO FIND THE SUBSCRIPTION (Guideline 2.1(b), about 6 minutes, no login): 1) Launch, tick "I have read and understand this", tap "Start". 2) Breath test, 3 steps: tap the big round START button, hold at least 5 seconds, tap STOP. Step 1 after an inhale; a 30-second rest runs by itself (START ends it early); step 2 after a full exhale; step 3: type any number of squats (e.g. 20), then START/STOP. 3) Tap "Calculate result". 4) Tap "Yes, do the exercise", then "Got it, let's start". 5) 3 exhale holds and 1 control inhale hold, START/STOP each, any length; rests run by themselves. 6) On the exercise result screen tap the blue "Let's start: Level 1 - $3.99" button; the subscription sheet opens; tap "Subscribe: Level 1 for $3.99 a year" (sandbox). The Paid Apps Agreement is active."""

app_id = call('GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data'][0]['id']
subs = [s for s in call('GET', f'/v1/apps/{app_id}/reviewSubmissions?filter[platform]=IOS&limit=10')['data']
        if s['attributes'].get('state') == 'UNRESOLVED_ISSUES']
print('unresolved submissions', [s['id'] for s in subs])
vers = call('GET', f'/v1/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=3')['data']
v = next(x for x in vers if x['attributes']['versionString'] == '1.0.20')
rd = call('GET', f'/v1/appStoreVersions/{v["id"]}/appStoreReviewDetail')['data']
notes = rd['attributes'].get('notes') or ''
if 'HOW TO FIND THE SUBSCRIPTION' not in notes:
    call('PATCH', f'/v1/appStoreReviewDetails/{rd["id"]}', {'data': {'type': 'appStoreReviewDetails', 'id': rd['id'],
         'attributes': {'notes': (notes + STEPS)[:4000]}}})
    print('review notes: subscription steps added')
for s in subs:
    for it in call('GET', f'/v1/reviewSubmissions/{s["id"]}/items')['data']:
        print('item', it['id'], it['attributes'].get('state'))
    call('PATCH', f'/v1/reviewSubmissions/{s["id"]}', {'data': {'type': 'reviewSubmissions', 'id': s['id'], 'attributes': {'submitted': True}}})
    print('RESUBMITTED', s['id'])
for s in call('GET', f'/v1/apps/{app_id}/reviewSubmissions?filter[platform]=IOS&limit=5')['data']:
    print('submission', s['id'], s['attributes'].get('state'))
for x in call('GET', f'/v1/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=3')['data']:
    print('version', x['attributes']['versionString'], x['attributes']['appStoreState'])
for g in call('GET', f'/v1/apps/{app_id}/subscriptionGroups')['data']:
    for sub in call('GET', f'/v1/subscriptionGroups/{g["id"]}/subscriptions')['data']:
        print('subscription', sub['attributes'].get('productId'), sub['attributes'].get('state'))
