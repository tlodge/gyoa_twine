/*
Parses passage text for links. Optionally, it returns internal links only --
e.g. those pointing to other passages in a story, not to an external web site.
*/

import uniq from 'lodash/uniq';
import uuid from 'tiny-uuid';

const selectors = {
	passage: 'tw-passage',
	story: 'tw-story',
	script: '[role=script]',
	stylesheet: '[role=stylesheet]',
	storyData: 'tw-storydata',
	tagColors: 'tw-tag',
	passageData: 'tw-passagedata'
};

// The top level regular expression to catch links -- i.e. [[link]].
const extractLinkTags = (text) => text.match(/\[\[.*?\]\]/g) || [];

// Links _not_ starting with a protocol, e.g. abcd://.
const internalLinks = (link) => !/^\w+:\/\/\/?\w/i.test(link);

// Links with some text in them.
const nonEmptyLinks = (link) => link !== '';

// Setter is the second [] block if exists.
const removeSetters = (link) => {
	const noSetter = getField(link, '][', 0);

	return noSetter ?? link;
};

const removeEnclosingBrackets = (link) =>
	link.substr(2, link.length - 4);

/**
 * Split the link by the separator and return the field in the given index.
 * Negative indices start from the end of the array.
 */

export const id = (str)=>{
	return str.replace(/[^\w\s\']|_/g, "_").replace(/\s+/g, "");
}

const getField = (link, separator, index) => {
	const fields = link.split(separator);

	if (fields.length === 1) {
		/* Separator not present. */
		return undefined;
	}

	return index < 0 ? {label:fields[0], link:id(fields[fields.length + index])} : {label: id(fields[index+2]), link:id(fields[index])};
};

// Arrow links:
// [[display text->link]] format
// [[link<-display text]] format
// Interpret the rightmost '->' and the leftmost '<-' as the divider.

const extractLink = (tagContent) => {
	return (
		getField(tagContent, '->', -1) || getField(tagContent, '<-', 0) || getField(tagContent, '|', -1) || tagContent
	);
};

export function filterLinkText(text){
	const links = text.match(/\[\[.*?\]\]/g) || [];
	return links.reduce((acc, link)=>{
		return acc.replace(link, "");
	}, text);
}
/**
 * Returns a list of unique links in passage source code.
 */
export function parseLinks(text, internalOnly=false) {
	// Link matching regexps ignore setter components, should they exist.

	
	let result = uniq(
		extractLinkTags(text)
			.map(removeEnclosingBrackets)
			.map(removeSetters)
			.map(extractLink)
			.filter(nonEmptyLinks)
	);

	if (internalOnly) {
		result = result.filter(internalLinks);
	}
	

	return result;
}




function query(el, selector) {
	return Array.from(el.querySelectorAll(selector));
}

function float(stringValue) {
	return parseFloat(stringValue);
}

/**
 * Convenience function to parse a string like "100,50".
 */
 function parseDimensions(raw){
	if (typeof raw !== 'string') {
		return undefined;
	}

	const bits = raw.split(',');

	if (bits.length === 2) {
		return [bits[0], bits[1]];
	}

	return undefined;
}

export function domToObject(storyEl){
	const startPassagePid = storyEl.getAttribute('startnode');
	let startPassageId = undefined;
	const story = {
		ifid: storyEl.getAttribute('ifid') ?? uuid(),
		id: uuid(),
		lastUpdate: undefined,
		name: storyEl.getAttribute('name') ?? undefined,
		storyFormat: storyEl.getAttribute('format') ?? undefined,
		storyFormatVersion: storyEl.getAttribute('format-version') ?? undefined,
		script: query(storyEl, selectors.script)
			.map(el => el.textContent)
			.join('\n'),
		stylesheet: query(storyEl, selectors.stylesheet)
			.map(el => el.textContent)
			.join('\n'),
		tags: storyEl.getAttribute('tags') ? storyEl.getAttribute('tags').split(/\s+/) : [],
		zoom: parseFloat(storyEl.getAttribute('zoom') ?? '1'),
		tagColors: query(storyEl, selectors.tagColors).reduce((result, el) => {
			const tagName = el.getAttribute('name');

			if (typeof tagName !== 'string') {
				return result;
			}

			return {...result, [tagName]: el.getAttribute('color')};
		}, {}),
		passages: query(storyEl, selectors.passageData).map(passageEl => {
			const id = uuid();
			const position = parseDimensions(passageEl.getAttribute('position'));
			const size = parseDimensions(passageEl.getAttribute('size'));

			if (passageEl.getAttribute('pid') === startPassagePid) {
				startPassageId = id;
			}

			return {
				id,
				left: position ? float(position[0]) : undefined,
				top: position ? float(position[1]) : undefined,
				width: size ? float(size[0]) : undefined,
				height: size ? float(size[1]) : undefined,
				tags: passageEl.getAttribute('tags') ? passageEl.getAttribute('tags').split(/\s+/): [],
				name: passageEl.getAttribute('name') ?? undefined,
				text: passageEl.textContent ?? undefined
			};
		})
	};

	story.startPassage = startPassageId;
	return story;
}


export  function format(text){
    let scene;
    const lines = [];
    const index = 0;

    if (text.indexOf("[") !== -1 && text.indexOf("]") != -1){
      text.split(/\s+/).forEach((token)=>{
          if (token.startsWith("[")){
            lines.push("")
          }
          lines[lines.length-1] = `${lines[lines.length-1]} ${token}`; 
      });
      
      return lines.map((l,i)=><div style={{marginTop: i == 0 ? 0 : 10}} key={i}>{l}</div>); 
    }
    else{
      return text;
    }
  }