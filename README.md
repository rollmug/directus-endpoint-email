# YCHC Email Endpoint

## Installation

Clone this repository into your directus project (in the same directory as your `docker-compose.yml` file):

```shell
git clone https://github.com/rollmug/directus-endpoint-email.git
```

Then run the following commands:

```shell
# cd into it
cd directus-endpoint-email

# install package dependencies
npm install

# then build the extension:
npm run build
```

The folders from the newly generated `dist` directory need to go into your Directus extensions folder. In a  Docker container, you can do this simply by adding it to the volume definitions in your `docker-compose.yml` file:

```yaml
volumes:
    - [other volumes here]
    - ./directus-endpoint-email/dist:/directus/extensions/endpoints/directus-extension-endpoint-email
```

Additionally, three environment variables are needed. Add them in appropriate section of the `docker-compose.yml` file:

```yaml
environment:
    [other env vars here]
    MAILCHIMP_API_KEY: ${MAILCHIMP_API_KEY}
    MAILCHIMP_FROM_EMAIL: ${MAILCHIMP_FROM_EMAIL}
    DIRECTUS_API_KEY: ${DIRECTUS_API_KEY}
```

Make sure these three env variables are also added to the `.env` file (or server environment), with the actual values for API Keys and email.

## Restart Directus

Restart the directus container to ensure the new extension is loaded. Check the logs to make sure there are no errors. 

## Update the extension:

```shell
cd directus-endpoint-email
git pull
npm run build
```

Then restart the directus service.

## Testing

To test that the extension is working, visit the endpoint URL in your browser (or send GET request in Postman):

```
https://your-domain.com/email
```

If everything is working, you should see the message: 'Endpoint is working.'

To test authentication, run a POST request (using Postman or similar) to:

```
https://your-domain.com/email/test
```

with an Authorization Bearer Token containing your API Key from Directus.

From the terminal, you can simply run:

```shell
curl --location --request POST 'http://your-domain.com/email/test' \
--header 'Authorization: Bearer YOUR-TOKEN-HERE'
```

If all goes well, you should get data with the message: 'Authorization was successful.'
