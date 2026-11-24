"""Send a rejected review submission (UNRESOLVED_ISSUES) back to App Review as it is (Nov 2026-11-24).
Prints its items first, then PATCH submitted=true, then prints the new states."""
from asc_api import call, BUNDLE

app_id = call('GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data'][0]['id']
subs = [s for s in call('GET', f'/v1/apps/{app_id}/reviewSubmissions?filter[platform]=IOS&limit=10')['data']
        if s['attributes'].get('state') == 'UNRESOLVED_ISSUES']
for s in subs:
    items = call('GET', f'/v1/reviewSubmissions/{s["id"]}/items?include=appStoreVersion,subscription,subscriptionGroup')
    for it in items['data']:
        print('item', it['attributes'].get('state'), list((it.get('relationships') or {}).keys()))
    for inc in items.get('included', []):
        print('  included', inc['type'], inc['attributes'].get('versionString') or inc['attributes'].get('productId') or inc['attributes'].get('referenceName'))
    call('PATCH', f'/v1/reviewSubmissions/{s["id"]}', {'data': {'type': 'reviewSubmissions', 'id': s['id'], 'attributes': {'submitted': True}}})
    print('RESUBMITTED', s['id'])
for s in call('GET', f'/v1/apps/{app_id}/reviewSubmissions?filter[platform]=IOS&limit=5')['data']:
    print('submission', s['id'], s['attributes'].get('state'))
for v in call('GET', f'/v1/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=3')['data']:
    print('version', v['attributes']['versionString'], v['attributes']['appStoreState'])
for g in call('GET', f'/v1/apps/{app_id}/subscriptionGroups')['data']:
    for sub in call('GET', f'/v1/subscriptionGroups/{g["id"]}/subscriptions')['data']:
        print('subscription', sub['attributes'].get('productId'), sub['attributes'].get('state'))
