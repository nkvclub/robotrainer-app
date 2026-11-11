"""Print the App Store review state of the iOS app and the Level 1 subscription. Read-only."""
from asc_api import call, BUNDLE

app_id = call('GET', f'/v1/apps?filter[bundleId]={BUNDLE}')['data'][0]['id']
for v in call('GET', f'/v1/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=5')['data']:
    a = v['attributes']
    print('version', a['versionString'], a['appStoreState'], a.get('appVersionState'), a.get('createdDate'))
for s in call('GET', f'/v1/apps/{app_id}/reviewSubmissions?filter[platform]=IOS&limit=5')['data']:
    a = s['attributes']
    print('submission', s['id'], a.get('state'), a.get('submittedDate'))
for g in call('GET', f'/v1/apps/{app_id}/subscriptionGroups')['data']:
    for sub in call('GET', f'/v1/subscriptionGroups/{g["id"]}/subscriptions')['data']:
        a = sub['attributes']
        print('subscription', a.get('productId'), a.get('state'))
