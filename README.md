# IdratekAlexa
Alexa Skill to interface with Idratek web

So far it works with dimmers and heating part of HVAC.
Deals with disovery, status and supports commands like:
"Alexa, kitchen lights 30%"
"Alexa, lights off"
"Alexa, make it warmer in here"
"Alexa, set the study to 18 degrees"

It also works quite well with the Alexa App
----
<img src="alexa_app1.jpg" height="250"> <img src="alexa_app2.jpg" height="250"> <img src="alexa_app3.jpg" height="250">
-----
This is set up to be hosted in lambda and requires 4 Environment variables to allow access to Idratek web server.
+ HOST_IP = exposed IP address (ideally static IP address) of your Cortex web server (just the IP address, no http://)
+ HOST_PORT = port assigned to your Cortex web server
+ HOST_UNAME = Cortex web username (must have web API permissions to objects you expect to control)
+ HOST_UPASS = password

Try testing, but don't use the SmartHome Discovery Test, use the following
{
  "directive": {
    "header": {
      "namespace": "Alexa.Discovery",
      "name": "Discover",
      "payloadVersion": "3",
      "messageId": "F8752B11-69BB-4246-B923-3BFB27C06C7D"
    },
    "payload": {
      "scope": {
        "type": "BearerToken",
        "token": "access-token-from-skill"
      }
    }
  }
}

Log in to the Alexa developer console
+ Create a new skill (smart home)
+ use the lamda ARN as the endpoint.

Support Account Linking (e.g. via Login With Amazon) 
+ create a LWA security profile (https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html)
+ Make a note of the LWA Client ID and Client Secret (in Web Settings - you also see 'Allowed Return URLs' field - back to this in a mo)
+ Back in the Alexa developer console for the skill, go to account linking
+ add in the LWA Authorization URI: https://www.amazon.com/ap/oa
+ add in the Access Token URI: https://api.amazon.com/auth/o2/token
+ add you Client ID and Secret from LWA
+ grab a copy of the Alexa Rediect URLs and add these back into your LWA 'Allowed Return URLs'

Testing in the alexa develope console will only work once you have enabled the skillin your Alexa App

In your Alexa App, add the skill and enable it - this should go through the account linking process.
Also go to Skills, scroll down to 'My Skills' and in the boxes at the top croll right to 'Dev' to renable and link etc.

there is some good advice on https://github.com/alexa-samples/alexa-smarthome/wiki/Build-a-Working-Smart-Home-Skill-in-15-Minutes 
