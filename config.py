#!/usr/bin/env python

import ee

# The service account email address authorized by your Google contact.
# Set up a service account as described in the README.
# EE_ACCOUNT = 'surface-water-beta@appspot.gserviceaccount.com'
EE_ACCOUNT = 'satgpt@satgpt-398210.iam.gserviceaccount.com'

# The private key associated with your service account in Privacy Enhanced
# Email format (.pem suffix).  To convert a private key from the RSA format
# (.p12 suffix) to .pem, run the openssl command like this:
# openssl pkcs12 -in downloaded-privatekey.p12 -nodes -nocerts > privatekey.pem
EE_PRIVATE_KEY_FILE = './satgpt-398210-ecd31b6b2712.json'
GOOGLE_MAPS_API_KEY = 'AIzaSyAqbSrWOhIE0H8XU4RL07zdpK-vdz_9DFk'
MAPBOX_ACCESS_KEY = 'pk.eyJ1IjoidW51aW53ZWgiLCJhIjoiY2tzYWJ5cHZhMDlsazMwcGNkaDNsaXEwNSJ9.uBRT8vrb9WHeQaR9JslIvA'
EE_CREDENTIALS = ee.ServiceAccountCredentials(EE_ACCOUNT, EE_PRIVATE_KEY_FILE)
CHATGPT_API_KEY = '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'