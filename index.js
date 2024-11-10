'use strict';

/**
 * This sample demonstrates a smart home skill using the publicly available API on Amazon's Alexa platform.
 * For more information about developing smart home skills, see
 *  https://developer.amazon.com/alexa/smart-home
 *
 * For details on the smart home API, please visit
 *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference
 */

/**
 * Utility functions
 */

function log(title, msg) {
    console.log(`[${title}] ${msg}`);
}

/**
 * Generate a unique message ID
 *
 * TODO: UUID v4 is recommended as a message ID in production.
 */
function generateMessageID() {
    const AWS = require('aws-sdk');
    return AWS.util.uuid.v4();
    
    //const uuidv4 = require('uuid/v4');  //original working version
    //const {"v4": uuidv4} = require('uuid');
    //import {v4 as uuidv4} from 'uuid';

    //return '38A28869-DD5E-48CE-BBE5-A4DB78CECB28'; // Dummy
    //return uuidv4(); // Dummy
}

/**
 * Generate a response message
 *
 * @param {string} name - Directive name
 * @param {Object} payload - Any special payload required for the response
 * @returns {Object} Response object
 */
function generateResponse(name, payload) {
    return {
        header: {
            messageId: generateMessageID(),
            name: name,
            namespace: 'Alexa.ConnectedHome.Control',
            payloadVersion: '3',
        },
        payload: payload,
    };
}


/**
 * Generate a response message
 *
 * @param {string} name - Directive name
 * @returns {Object} Response object
 */
function generateContext(namespace, name, value) {
    return {
        properties: [
        generateProperty(namespace, name, value),
        generateProperty("Alexa.EndpointHealth", "connectivity", "OK")
    ]};
}

/**
 * Generate a property object 
 *
 * @param {string} name - Directive name
 * @returns {Object} Response object
 */
function generateProperty(namespace, name, value) {
    const now = new Date(Date.now());
    return {
            namespace: namespace,
            name: name,
            value: value,
            timeOfSample: now,
            uncertaintyInMilliseconds: 200
        };
}

/**
 * Generate an event message
 *
 * @param {string} name - Event name
 * @param {Object} payload - Any special payload required for the response
 * @returns {Object} Response object
 */
function generateEvent(name, endpointId, token, payload) {
    return {
        header: {
            messageId: generateMessageID(),
            name: name,
            namespace: 'Alexa',
            payloadVersion: '3',
        },
        endpoint: {
            scope: {
                type: "BearerToken",
                token: token
            },
            endpointId: endpointId
        },
        payload: {payload},
    };
}

/**
 * Perform HTTP request on cortex API
 *
 * @param {string} reqtype - Get or POST
 * @param {string} command - URL to pass in (beware injection)
 * @returns {string} HTTP: Response string
 */
 
/* this is a promise - must reject or resolve */
function doHttpReqProm(reqType, command) {
    return new Promise (function (resolve,reject){
    var http = require('http');
    log("HTTP request", command);
    let hostip = process.env.HOST_IP;
    let hostuname = process.env.HOST_UNAME;
    let hostupass = process.env.HOST_UPASS;

    var options = {
      host: ''+hostip,
      path: '/api/v1/'+command,
      port: '1087',
      method: ''+reqType,
      auth: hostuname + ':' + hostupass,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength("")
      }
    };
    


    var req = http.request(options, function(response) {
      // handle the response
      var res_data = '';
      response.on('data', function(chunk) {
        res_data += chunk;
      });
      
      response.on('end', function() {
        log("HTTP response", res_data);
        resolve(res_data);
      });

    });
    
    req.on('error', function(e) {
      log("Cortex error: ", e.message);
      reject(e.message);
    });
    
    req.write("");
    req.end();
    });
}



function handleObjList(objlist) {
    var parsed = JSON.parse(objlist);
    var objArr = parsed["CortexAPI"]["CortexObject"];
    var devArr =[];
    for(var i=0; i<objArr.length; i++) // the parsed array of objects
    {
        switch (objArr[i]["ControlObjectType"]) {
        case 'IdratekDimmer1':
            //lighting control identified
            devArr.push(handleObj(objArr[i]));
            break;

        case 'HVAC':
            //this is a temp control
            break;

        case 'Temperature':
            //this is a temp reading
            break;

        default: 
            //do nothing
        }
    }
    return devArr;
}


function handleObj(obj) {

        return {
            endpointId:obj.IDNumber,
            manufacturerName:"Idratek",
            version: '1.0',
            friendlyName:obj.FriendlyName,
            description:obj.FriendlyName + " on Idratek",
            displayCategories: [
                "LIGHT"
            ],
            capabilities:[{
                type: "AlexaInterface",
                interface: "Alexa.PowerController",
                version: "3",
                properties: {
                    supported: [{
                        name: "powerState"
                    }],
                    proactivelyReportable: true,
                    retrievable: true
                }
            },
            {
                type: "AlexaInterface",
                interface: "Alexa.BrightnessController",
                version: "3",
                properties: {
                    supported: [{
                        name: "brightness"
                    }],
                    proactivelyReportable: true,
                    retrievable: true
                }
            }],
            // not used at this time
            cookie: {
                },
            };
}


function handleErrors(error) {
  log('ERROR: ', error);
}


function isValidToken() {
    /**
     * Always returns true for sample code.
     * You should update this method to your own access token validation.
     */
    return true;
}

function isDeviceOnline(applianceId) {
    log('DEBUG:', `isDeviceOnline (applianceId: ${applianceId})`);
    /**
     * Always returns true for sample code.
     * You should update this method to your own validation.
     */
    return true;
}


function getState(applianceId) {
    log('DEBUG', `getState (applianceId: ${applianceId})`);

    const CRequest = doHttpReqProm("GET",`Ports.json/${applianceId}/13`);
    return CRequest
        .then(handleObjState)
        .catch(handleErrors);
    // Call device cloud's API to set percentage delta
}

function handleObjState(state) {
    log('DEBUG', `handleState : ${state}`);
    let parsed = JSON.parse(state);
    let percentage = parsed["CortexAPI"]["PortEvent"]["Value"];
    let onOff = parsed["CortexAPI"]["PortEvent"]["State"]=="True"?"ON":"OFF";
    let context=generateContext('Alexa.BrightnessController','brightness', percentage);
    context.properties.push(generateProperty('Alexa.PowerController','powerState',onOff));
    return context;
    // Call device cloud's API to set percentage delta
}

/**
 * Main logic
 */

/**
 * This function is invoked when we receive a "Discovery" message from Alexa Smart Home Skill.
 * We are expected to respond back with a list of appliances that we have discovered for a given customer.
 *
 * @param {Object} request - The full request object from the Alexa smart home service. This represents a DiscoverAppliancesRequest.
 *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesrequest
 *
 * @param {function} callback - The callback object on which to succeed or fail the response.
 *     https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html#nodejs-prog-model-handler-callback
 *     If successful, return <DiscoverAppliancesResponse>.
 *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
 */
 
function handleDiscovery(request, callback) {
    log('DEBUG', `Discovery Request: ${JSON.stringify(request)}`);

    /**
     * Get the access token.
     */
    const userAccessToken = request.directive.payload.scope.token.trim();

    if (!userAccessToken || !isValidToken(userAccessToken)) {
        log('ERROR', `Discovery Request [${request.header.messageId}] failed. Invalid access token: ${userAccessToken}`);
        callback(null, generateResponse('InvalidAccessTokenError', {}));
        return;
    }

    var event = {
        header: {
            namespace: 'Alexa.Discovery',
            name: 'Discover.Response',
            payloadVersion: '3',
            messageId: generateMessageID(),
        },
        payload: {
            endpoints: {},
        },
    };


    doHttpReqProm("GET","Objects.json/")
    .then(function(reply){
        event.payload.endpoints=handleObjList(reply);
        log('DEBUG', `Discovery Response: ${JSON.stringify({event})}`);
        callback(null, {event});        // Return result with successful message.
    })
    .catch(handleErrors);
}


/**
 * A function to handle control events.
 * This is called when Alexa requests an action such as turning off an appliance.
 *
 * @param {Object} request - The full request object from the Alexa smart home service.
 * @param {function} callback - The callback object on which to succeed or fail the response.
 */
function handleControl(request, callback) {
    log('DEBUG', `Control Request: ${JSON.stringify(request)}`);

    /**
     * Get the access token.
     */
    const userAccessToken = request.directive.endpoint.scope.token.trim();
    const correlationToken = request.directive.header.correlationToken.trim();

    /**
     * Generic stub for validating the token against your cloud service.
     * Replace isValidToken() function with your own validation.
     *
     * If the token is invliad, return InvalidAccessTokenError
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#invalidaccesstokenerror
     */
    if (!userAccessToken || !isValidToken(userAccessToken)) {
        log('ERROR', `Discovery Request [${request.header.messageId}] failed. Invalid access token: ${userAccessToken}`);
        callback(null, generateResponse('InvalidAccessTokenError', {}));
        return;
    }

    /**
     * Grab the applianceId from the request.
     */
    const applianceId = request.directive.endpoint.endpointId;

    /**
     * If the applianceId is missing, return UnexpectedInformationReceivedError
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#unexpectedinformationreceivederror
     */
    if (!applianceId) {
        log('ERROR', 'No applianceId provided in request');
        const payload = { faultingParameter: `applianceId: ${applianceId}` };
        callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
        return;
    }

    /**
     * At this point the applianceId and accessToken are present in the request.
     *
     * Please review the full list of errors in the link below for different states that can be reported.
     * If these apply to your device/cloud infrastructure, please add the checks and respond with
     * accurate error messages. This will give the user the best experience and help diagnose issues with
     * their devices, accounts, and environment
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#error-messages
     */
    if (!isDeviceOnline(applianceId, userAccessToken)) {
        log('ERROR', `Device offline: ${applianceId}`);
        callback(null, generateResponse('TargetOfflineError', {}));
        return;
    }

    let event,context;
    let command,namespace, name, value;

    switch (request.directive.header.name) {
        case 'TurnOn':
            command = `Objects.json/${applianceId}?5=1`;
            namespace='Alexa.PowerController';
            name='powerState';
            value='ON';
            break;

        case 'TurnOff':
            command = `Objects.json/${applianceId}?6=1`;
            namespace='Alexa.PowerController';
            name='powerState';
            value='OFF';
            break;

        case 'SetBrightness': {
            const percentage = request.directive.payload.brightness;
            if (!percentage) {
                const payload = { faultingParameter: `percentageState: ${percentage}` };
                callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
                return;
            }
            if (percentage>0) {   doHttpReqProm("POST",`Objects.json/${applianceId}?5=1`); } //send an ON command in case not on

            command = `Objects.json/${applianceId}?10=${percentage}`;
            namespace='Alexa.BrightnessController';
            name='brightness';
            value=percentage;
            break;
        }
        

/*        
no longer used

        case 'AdjustBrightness': {
            const delta = request.directive.payload.brightnessDelta.value;
            if (!delta) {
                const payload = { faultingParameter: `deltaPercentage: ${delta}` };
                callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
                return;
            }
            if (delta>0){
                context = incrementPercentage(applianceId, userAccessToken, delta); port 11
            } else {
                context = decrementPercentage(applianceId, userAccessToken, delta); port 12
            }
            break;
        }
        
        */

        default: {
            log('ERROR', `No supported directive name: ${request.directive.header.name}`);
            callback(null, generateResponse('UnsupportedOperationError', {}));
            return;
        }
    }

    doHttpReqProm("POST",command)
    .then(function(reply){ //ensure function does not run ahead until details recieved
        //could look at reply to check success
        context=generateContext(namespace, name, value);
        event=generateEvent("Response", applianceId, userAccessToken,correlationToken, {});
        log('DEBUG', `Control Confirmation: ${JSON.stringify({context,event})}`);
        callback(null, {context,event});
    })
    .catch(handleErrors);

}


/**
 * A function to handle query events.
 * This is called when Alexa requests info on an appliance.
 *
 * @param {Object} request - The full request object from the Alexa smart home service.
 * @param {function} callback - The callback object on which to succeed or fail the response.
 */
function handleQuery(request, callback) {
    log('DEBUG', `Query Request: ${JSON.stringify(request)}`);

    /**
     * Get the access token.
     */
    const userAccessToken = request.directive.endpoint.scope.token.trim();
    const correlationToken = request.directive.header.correlationToken.trim();


    if (!userAccessToken || !isValidToken(userAccessToken)) {
        log('ERROR', `Discovery Request [${request.header.messageId}] failed. Invalid access token: ${userAccessToken}`);
        callback(null, generateResponse('InvalidAccessTokenError', {}));
        return;
    }

    const applianceId = request.directive.endpoint.endpointId; //    Grab the applianceId from the request.

    /**
     * If the applianceId is missing, return UnexpectedInformationReceivedError
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#unexpectedinformationreceivederror
     */
    if (!applianceId) {
        log('ERROR', 'No applianceId provided in request');
        const payload = { faultingParameter: `applianceId: ${applianceId}` };
        callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
        return;
    }

    if (!isDeviceOnline(applianceId, userAccessToken)) {
        log('ERROR', `Device offline: ${applianceId}`);
        callback(null, generateResponse('TargetOfflineError', {}));
        return;
    }

    let context,event;
    //get the state of the endpoint

    if (request.directive.header.name != 'ReportState'){
        log('ERROR', `No supported directive name: ${request.header.name}`);
        callback(null, generateResponse('UnsupportedOperationError', {}));
        return;
    }
    
    doHttpReqProm("GET",`Ports.json/${applianceId}/13`)
    .then(function(reply){ //ensure function does not run ahead until details recieved
        context = handleObjState(reply);
        event=generateEvent("StateReport", applianceId, userAccessToken,correlationToken,{});
        log('DEBUG', `Request Confirmation: ${JSON.stringify({context,event})}`);
        callback(null, {context,event});
    })
    .catch(handleErrors);
}


/**
 * Main entry point.
 * Incoming events from Alexa service through Smart Home API are all handled by this function.
 *
 * It is recommended to validate the request and response with Alexa Smart Home Skill API Validation package.
 *  https://github.com/alexa/alexa-smarthome-validation
 */
exports.handler = (request, context, callback) => {
   // switch (request.header.namespace) {
    switch (request.directive.header.namespace) {
        case 'Alexa.Discovery':
            handleDiscovery(request, callback);
            break;

        case 'Alexa.BrightnessController':
        case 'Alexa.PowerController':
            handleControl(request, callback);
            break;

        case 'Alexa':
            handleQuery(request, callback);
            break;

        default: {
            const errorMessage = `No supported namespace: ${request.header.namespace}`;
            log('ERROR', errorMessage);
            callback(new Error(errorMessage));
        }
    }
};
