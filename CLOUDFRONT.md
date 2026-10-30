# CloudFront Deployments

Use the `.env.cloudfront` settings as the `.env` file for generating the static site with `nuxt generate` and the output
files in `.output/public` need to be copied to the S3 bucket.

## CloudFront redirects
Most of the routes are generated as static HTML files. There needs to be a CloudFront function on the distribution that
will redirect bare urls to the appropriate index.html file. For puzzle routes there also needs to be a redirect that
goes to the root index.html and then the Nuxt router will do the rest.

Make a CloudFront function called `PuzzleRewriteDefaultIndexRequest` and add it as a function asssociation on a
behaviour for the CloudFront distribution. This should be sufficient:

```
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    if (uri.startsWith('/puzzle/') || uri.startsWith('/puzzles/')) {
        request.uri = '/index.html';
    } 
    // Check whether the URI is missing a file name.
    else if (uri.endsWith('/')) {
        request.uri += 'index.html';
    } 
    // Check whether the URI is missing a file extension.
    else if (!uri.includes('.')) {
        request.uri += '/index.html';
    }

    return request;
}
```

