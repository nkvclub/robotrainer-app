"""Take the waiting App Store version out of review so a new build can be attached (Nov 2026-11-11).
Only cancels a review submission that is WAITING_FOR_REVIEW; then waits until the version is editable.
The listing step (listing.py with ASC_STEP=submit and APP_BUILD) attaches the build and sends it again."""
import time
from asc_api import call, BUNDLE

app_id = call('GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data'][0]['id']
for s in call('GET', f'/v1/apps/{app_id}/reviewSubmissions?filter[platform]=IOS&limit=10')['data']:
    if s['attributes'].get('state') == 'WAITING_FOR_REVIEW':
        call('PATCH', f'/v1/reviewSubmissions/{s["id"]}', {'data': {'type': 'reviewSubmissions', 'id': s['id'], 'attributes': {'canceled': True}}})
        print('canceled review submission', s['id'])
for i in range(30):
    vers = call('GET', f'/v1/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=5')['data']
    st = [(v['attributes']['versionString'], v['attributes']['appStoreState']) for v in vers]
    print('versions', st)
    if not any(x[1] in ('WAITING_FOR_REVIEW', 'IN_REVIEW') for x in st):
        break
    time.sleep(10)
for s in call('GET', f'/v1/apps/{app_id}/reviewSubmissions?filter[platform]=IOS&limit=5')['data']:
    print('submission', s['id'], s['attributes'].get('state'))
for g in call('GET', f'/v1/apps/{app_id}/subscriptionGroups')['data']:
    for sub in call('GET', f'/v1/subscriptionGroups/{g["id"]}/subscriptions')['data']:
        print('subscription', sub['attributes'].get('productId'), sub['attributes'].get('state'))
