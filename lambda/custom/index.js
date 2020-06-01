/* eslint-disable  func-names */
/* eslint-disable  no-restricted-syntax */
/* eslint-disable  no-loop-func */
/* eslint-disable  consistent-return */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');

const persistenceAdapter = new DynamoDbPersistenceAdapter({
    tableName: 'NurseAmieTable',
    createTable: true
});

/* INTENT HANDLERS */

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const RecommendationIntent = {
			name: "RecommendationIntent",
			confirmationStatus: "NONE",
    };

    const NameIntent = {
      name: "NameIntent",
      confirmationStatus: "NONE",
    };

    let attributes = await handlerInput.attributesManager.getPersistentAttributes(handlerInput.requestEnvelope);
    let prompt;
    let intent;
    if (!attributes.name) {
      // User has not used Nurse Amie before, prompt user for their name.
      prompt = 'Hello! Welcome to AMIE. I will be your personal assistant, helping you with your breast cancer.';
      intent = NameIntent;
    } else {
      prompt = `Hi ${attributes.name}! Welcome back to AMIE. Let's get started!`;
      intent = RecommendationIntent;
    } 
    
    return handlerInput.responseBuilder
      .speak(prompt)
      .addDelegateDirective(intent)
      .getResponse();
  },
};

const FallbackHandler = {
  // 2018-Nov-21: AMAZON.FallackIntent is currently available in en-* and de-DE locales.
  //              This handler will not be triggered except in those locales, so it can be
  //              safely deployed here in the code for any locale.
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(FALLBACK_MESSAGE)
      .reprompt(FALLBACK_REPROMPT)
      .getResponse();
  },
};

const RecommendationIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'RecommendationIntent';
  },
  async handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    
    const { sleep, distress, fatigue, pain } = currentIntent.slots;

    const prompt = `The user answered ${sleep.value} for sleep, ${distress.value} for distress, ${fatigue.value} for fatigue, and lastly ${pain.value} for pain`;

    // TODO - add code for parsing these values

    // Save attributes for date so that we can see how they change over time
    let attributes = await handlerInput.attributesManager.getPersistentAttributes();

    let date = new Date();

    attributes[date.toDateString()] = { sleep, distress, fatigue, pain };
    
    /* This will be rewritten every time this function runs, but could be useful if we ever want
    to know how the user was feeling the last session */
    attributes.latestScores = { sleep, distress, fatigue, pain };

    handlerInput.attributesManager.setPersistentAttributes(attributes);


    // TODO - This is where we could add code to delegate different intents to the user based on their answers

    return handlerInput.responseBuilder
      .speak(prompt)
      .getResponse();
  },
};

const NameIntent = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'NameIntent';
  },
  async handle(handlerInput) {
    const currentIntent = handlerInput.requestEnvelope.request.intent;
    
    const name = currentIntent.slots.name.value;

    let attributes = await handlerInput.attributesManager.getPersistentAttributes();

    attributes.name = name;

    handlerInput.attributesManager.setPersistentAttributes(attributes);

    const prompt = `Thank you, ${name}! I will start with a brief introduction
    of the application. I can help you exercise, manage and track your symptoms,
    learn coping strategies, play soothing music, and guide you through relaxation strategies.
    To begin, I am going to ask you a couple questions about how you are feeling today`;

    const RecommendationIntent = {
			name: "RecommendationIntent",
			confirmationStatus: "NONE",
    };
    
    return handlerInput.responseBuilder
      .speak(prompt)
      .addDelegateDirective(RecommendationIntent)
      .getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('I can help you exercise, manage and track your symptoms, learn coping strategies, play soothing music, and guide you through relaxation strategies.')
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;

    return request.type === 'IntentRequest'
      && (request.intent.name === 'AMAZON.CancelIntent'
        || request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Bye')
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};


const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

/* CONSTANTS */

const skillBuilder = Alexa.SkillBuilders.custom();
const SKILL_NAME = 'Nurse Amie';
const FALLBACK_MESSAGE = `The ${SKILL_NAME} skill can\'t help you with that.`;
const FALLBACK_REPROMPT = 'What can I help you with?';

/* INTERCEPTORS */

const SavePersistentAttributesResponseInterceptor = {
  async process(handlerInput) {
    await handlerInput.attributesManager.savePersistentAttributes();
  },
};


exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    RecommendationIntent,
    NameIntent,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler,
  )
  .withPersistenceAdapter(persistenceAdapter)
  .addResponseInterceptors(SavePersistentAttributesResponseInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();
