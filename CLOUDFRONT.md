# CloudFront Deployments

The site is a static `nuxt generate` build in `.output/public`, synced to the S3 bucket by
the deploy workflow (see Deployments in the README).

## CloudFront rewrites

Every page is drawn in the browser from `/index.html`, so a CloudFront function has to
serve `/index.html` for any URL that isn't a real file (`/c/charity-sample`,
`/c/charity-sample/day/3`, a campaign domain's `/`). Real files all have an extension.

Make a CloudFront function called `CampaignRewriteIndexRequest` and add it as a viewer
request function association on the distribution's default behaviour:

```
function handler(event) {
    var request = event.request;

    if (!request.uri.includes('.')) {
        request.uri = '/index.html';
    }

    return request;
}
```
