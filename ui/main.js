/*
 * Main logic for controlling editor.
 */

import * as apiUtils from './api_utils.js';
import * as outputParsers from './output_parsers.js';
import * as prefixes from './prefixes.js';
import * as promptConstructors from './prompt_constructors.js';
import * as render from './render.js';

const DEFAULT_SAMPLE_LENGTH = 511;
const SAMPLE_LENGTH_TITLE = 64;
const SAMPLE_LENGTH_PLACE = 128;
const MAX_PARAGRAPH_LENGTH = 1024;
const MAX_PARAGRAPH_LENGTH_CHARACTERS = 2048;
const MAX_PARAGRAPH_LENGTH_SCENES = 4096;

const apiKey = window.location.hash.slice(1);

/************************************************************************
 * UI content extractors                                                *
 ************************************************************************/

/** Gets the storyline from the UI.
 * @return {string?}
 */
function storyline() {
  return document.querySelector('#storyline-field').value;
}

/**
 * Gets the title from the UI.
 * @return {string?}
 */
function title() {
  return document.querySelector('#title-field').value;
}

/**
 * Gets the place descriptions from the UI.
 * @return {string?}
 */
function places() {
  return document.querySelector('#places-field').value;
}

/**
 * Gets the scene descriptions from the UI.
 * @return {string?}
 */
function scenes() {
  return document.querySelector('#scenes-field').value;
}

/**
 * Gets the characters from the UI.
 * @return {string?}
 */
function characters() {
  return document.querySelector('#characters-field').value;
}

/**
 * Gets the dialogues from the UI.
 * @return {Array<HTMLElement?>?}
 */
function dialogFields() {
  return document.querySelectorAll('.dialog-field');
}

/************************************************************************
 * UI manipulation utilities                                            *
 ************************************************************************/

/** Sets the display of all objects of class {cls} to the given value. */
function setDisplay(cls, display) {
  document.querySelectorAll(`.${cls}`).forEach(
      el => el.style.display = display);
}

/** Shows the loading indicator and hides the button element. */
function showLoading(selector) {
  document.querySelector(selector).style.display = 'none';
  document.querySelector(`${selector}-loader`).style.display = 'unset';
}

/** Shows the button element and hides the loading indicator. */
function stopLoading(selector) {
  document.querySelector(selector).style.display = 'unset';
  document.querySelector(`${selector}-loader`).style.display = 'none';
}

/************************************************************************
 * Dialog generation buttons                                            *
 ************************************************************************/

/**
 * Shows the download buttons once the dialogue has been generated for every
 * scene.
 */
function checkDialoguesGenerated() {
  for (const field of document.querySelectorAll('.dialog-field')) {
    if (!field.value) return;
  }
  setDisplay('download', 'unset');
}

/**
 * Darkens a scene button when clicked to show that scene is active, and
 * lightens the other scene buttons.
 */
function updateButtonColors(sceneIndex) {
  const buttons = document.querySelectorAll('.submit-dialog-button');
  let i = 0;
  for (const button of buttons) {
    if (i == sceneIndex) {
      button.style.backgroundColor = '#575757';
      button.style.color = 'white';
    } else {
      button.style.backgroundColor = '#e3e3e3';
      button.style.color = 'black';
    }
    i += 1;
  }
}

/**
 * Pulls appropriate scene and setting information and makes request to
 * generate the dialogue for that scene.
 */
async function generateDialog(sceneIndex) {
  const dialogLoader = document.querySelector('#submit-dialog-loader');
  dialogLoader.style.display = 'unset';
  const dialogPrompt = promptConstructors.createDialogPrompt(
      sceneIndex, scenes(), places(), characters(), storyline());
  const response = await apiUtils.sampleUntilSuccess(
      apiKey, dialogPrompt, DEFAULT_SAMPLE_LENGTH, MAX_PARAGRAPH_LENGTH,
      function(r) {
        return r;
      });
  const field = document.querySelector(`#dialog-field-${sceneIndex}`);
  field.value = response;
  setDisplay('dialog-mid', 'unset');
  setDisplay('dialog-field', 'none');
  field.style.display = 'unset';
  dialogLoader.style.display = 'none';
  checkDialoguesGenerated();
}

/** Creates dialogue buttons and fields once the scenes have been generated. */
function createDialogComponents() {
  const buttonContainer = document.querySelector('#submit-dialog-buttons');
  const fieldContainer = document.querySelector('#dialog-fields');
  buttonContainer.textContent = '';
  fieldContainer.textContent = '';
  const sceneLocations = scenes().split(prefixes.PLACE_ELEMENT.trim());
  for (let i = 1; i < sceneLocations.length; i++) {
    // Add generation button.
    const button = document.createElement('button');
    button.classList.add('dialog-main');
    button.classList.add('submit-dialog-button');
    button.id = `dialog-button-${i}`;
    button.textContent = `Scene ${i}`;
    button.onclick = async (evt) => {
      setDisplay('dialog-field', 'none');
      const sceneIndex = Number(evt.target.id.split('-')[2]);
      updateButtonColors(sceneIndex - 1);
      await generateDialog(sceneIndex);
    };
    buttonContainer.appendChild(button);

    // Add output field.
    const field = document.createElement('textarea');
    field.classList.add('dialog-mid');
    field.classList.add('dialog-min');
    field.classList.add('dialog-field');
    field.id = `dialog-field-${i}`;
    field.setAttribute('rows', 10);
    fieldContainer.appendChild(field);
  }
}

/************************************************************************
 * Send requests on button clicks                                       *
 ************************************************************************/

/** Storyline controls **/

/** Updates UI when continuing past the storyline entry field. */
document.querySelector('#submit-storyline').onclick = function() {
  document.querySelector('#storyline-field').setAttribute('rows', 1);
  setDisplay('storyline-main', 'none');
  setDisplay('storyline-min', 'unset');
  setDisplay('title-main', 'unset');
};

/** Title controls **/

/** Submits request for title generation. */
document.querySelector('#submit-title').onclick = async () => {
  document.querySelector('#title-field').setAttribute('rows', 1);
  setDisplay('title-mid', 'none');
  setDisplay('title-error', 'none');
  const prompt = `${prefixes.TITLES_PROMPT}${storyline()}`;
  showLoading('#submit-title');
  const response = await apiUtils.sampleUntilSuccess(
      apiKey, prompt, SAMPLE_LENGTH_TITLE, MAX_PARAGRAPH_LENGTH,
      outputParsers.extractTitle);
  if (response == undefined) {
    setDisplay('title-error', 'unset');
  } else {
    setDisplay('title-mid', 'unset');
    setDisplay('title-error', 'none');
    document.querySelector('#title-field').value = response;
  }
  stopLoading('#submit-title');
};

/** Updates UI when continuing past the title entry field. */
document.querySelector('#continue-title').onclick = function() {
  setDisplay('title-main', 'none');
  setDisplay('title-mid', 'none');
  setDisplay('title-min', 'unset');
  setDisplay('characters-main', 'unset');
};

/** Characters controls **/

/** Submits request for character generation. */
document.querySelector('#submit-characters').onclick = async () => {
  setDisplay('characters-mid', 'none');
  setDisplay('characters-error', 'none');
  const prompt = `${prefixes.CHARACTERS_PROMPT}${storyline()}`;
  showLoading('#submit-characters');
  const response = await apiUtils.sampleUntilSuccess(
      apiKey, prompt, DEFAULT_SAMPLE_LENGTH, MAX_PARAGRAPH_LENGTH_CHARACTERS,
      outputParsers.extractCharacters);
  if (response == undefined) {
    setDisplay('characters-error', 'unset');
  } else {
    setDisplay('characters-mid', 'unset');
    setDisplay('characters-error', 'none');
    document.querySelector('#characters-field').value = response;
  }
  stopLoading('#submit-characters');
};

/** Updates UI when continuing past the character entry field. */
document.querySelector('#continue-characters').onclick = function() {
  setDisplay('characters-main', 'none');
  setDisplay('characters-mid', 'none');
  setDisplay('characters-min', 'unset');
  setDisplay('scenes-main', 'unset');
};

/** Scenes controls **/

/** Submits request for scene generation. */
document.querySelector('#submit-scenes').onclick = async () => {
  setDisplay('scenes-mid', 'none');
  setDisplay('scenes-error', 'none');
  const prompt = `${prefixes.SCENE_PROMPT}${storyline()}\n${characters()}`;
  showLoading('#submit-scenes');
  const response = await apiUtils.sampleUntilSuccess(
      apiKey, prompt, DEFAULT_SAMPLE_LENGTH, MAX_PARAGRAPH_LENGTH_SCENES,
      outputParsers.extractScenes);
  if (response == undefined) {
    setDisplay('scenes-error', 'unset');
  } else {
    setDisplay('scenes-mid', 'unset');
    setDisplay('scenes-error', 'none');
    document.querySelector('#scenes-field').value = response;
  }
  stopLoading('#submit-scenes');
  createDialogComponents();
};

/** Updates UI when continuing past the scene description entry field. */
document.querySelector('#continue-scenes').onclick = function() {
  document.querySelector('#scenes-field').setAttribute('rows', 2);
  setDisplay('scenes-main', 'none');
  setDisplay('scenes-mid', 'none');
  setDisplay('scenes-min', 'unset');
  setDisplay('places-main', 'unset');
};

/** Places controls **/

/** Submits request for place description generation. */
document.querySelector('#submit-places').onclick = async () => {
  setDisplay('places-mid', 'none');
  showLoading('#submit-places');
  const placeNames = outputParsers.extractPlaceNames(scenes());
  const basePrompt = `${prefixes.SETTING_PROMPT}${storyline()}\n`;
  const sampledPlaces = [];
  for (const placeName of placeNames) {
    const placePrefix = `${prefixes.PLACE_ELEMENT}${placeName}`;
    const placePrompt = `${placePrefix}\n${prefixes.DESCRIPTION_ELEMENT}`;
    const response = await apiUtils.sampleUntilSuccess(
        apiKey, `${basePrompt}${placePrompt}`, SAMPLE_LENGTH_PLACE,
        MAX_PARAGRAPH_LENGTH, function(r) {
          return outputParsers.extractPlace(r, placePrefix);
        });
    if (response !== undefined) {
      sampledPlaces.push(response);
    }
  }
  document.querySelector('#places-field').value = sampledPlaces.join('\n\n');
  stopLoading('#submit-places');
  setDisplay('places-mid', 'unset');
};

/** Updates UI when continuing past the place description entry field. */
document.querySelector('#continue-places').onclick = function() {
  document.querySelector('#places-field').setAttribute('rows', 2);
  setDisplay('places-main', 'none');
  setDisplay('places-mid', 'none');
  setDisplay('places-min', 'unset');
  setDisplay('dialog-main', 'unset');
};

/** Downloads the full script. */
document.querySelector('#submit-download').onclick = function() {
  const text = render.renderStory(
      title(), storyline(), scenes(), places(), characters(), dialogFields());
  const downloadElement = document.createElement('a');
  downloadElement.setAttribute(
      'href', `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
  downloadElement.setAttribute('download', 'dramatron.txt');
  downloadElement.style.display = 'none';
  document.body.appendChild(downloadElement);
  downloadElement.click();
  document.body.removeChild(downloadElement);
};

/** Reloads the page to restart the flow. */
document.querySelector('#submit-start-over').onclick = function() {
  window.location.reload();
};