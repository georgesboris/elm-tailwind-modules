import { toElmName, fixClass } from "./helpers.js";
import CssWhat from "css-what";
import deepEqual from "deep-equal";

export function groupDeclarationBlocksByClass(postCssRoot) {
    let rules = [];

    postCssRoot.walkRules(rule => {
        rules.push(rule);
    });

    const recognized = new Map();
    const unrecognized = [];

    const defaultRecognized = () => ({
        propertiesBySelector: [],
    });

    rules.forEach(rule => {


        // parse the selector

        let selector;
        try {
            selector = CssWhat.parse(rule.selector);
        } catch (e) {
            // Couldn't parse this. TOOD: Remove try-catch?
            console.log("Didn't recognize selector", rule.selector);
            unrecognized.push(rule);
            return;
        }


        // make sure all selector parts start with the same class

        const parts = selector.map(stripClassSelector);
        const partClasses = parts.map(part => part.class);

        const allEqual = arr => arr.every(v => v === arr[0])

        if (partClasses.some(className => className == null) || !allEqual(partClasses)) {
            unrecognized.push(rule);
            console.log("Didn't recognize common class prefix", parts);
            return;
        }

        const className = parts[0].class;
        // create a valid elm identifier from the classname
        const elmDeclName = toElmName(fixClass(className));



        // collect all properties defined in this rule

        const properties = collectProperties(rule);


        // find out what subselector this affects
        let subselectors;
        try {
            subselectors = parts.map(part => ({
                mediaQuery: recognizeMediaQuery(rule),
                rest: recognizeSelectorRest(part.rest),
            }));
        } catch (e) {
            unrecognized.push(rule);
            console.log("Didn't recognize subselectors", parts);
            return;
        }


        // concat properties to possibly existing property lists
        const item = recognized.get(elmDeclName) || defaultRecognized();
        recognized.set(elmDeclName, {
            propertiesBySelector: addToSelectorList(
                item.propertiesBySelector,
                subselectors,
                properties,
            ),
        });
    });

    return { recognized, unrecognized };
}

function addToSelectorList(propertiesBySelector, subselectors, properties) {
    let result = Array.from(propertiesBySelector);

    const index = result.findIndex(elem => deepEqual(elem.subselectors, subselectors));

    if (index >= 0) {
        result[index] = {
            subselectors: subselectors,
            properties: result[index].properties.concat(properties),
        };
        return result;
    }

    result.push({
        subselectors,
        properties,
    });

    return result;
}

function recognizeMediaQuery(rule) {
    if (rule.parent.type === "atrule") {
        return rule.parent.params;
    }
    return null;
}

function recognizeSelectorRest(selector) {
    if (selector.length === 0) {
        return { type: "plain" };
    }

    const type = selector[0].type;
    let rest;
    try {
        // this is hacky, but gets the job done.
        rest = CssWhat.stringify([selector.slice(1)]);
    } catch (e) {
        console.error("failed stringifying", selector.slice(1));
    }
    const supportedTypes = ["child", "decendant", "adjacent", "sibling"];

    if (supportedTypes.some(supported => supported === type)) {
        return { type, rest };
    }

    throw new Error(`Unsupported type: ${type}`);
}

function collectProperties(rule) {
    let properties = [];
    rule.walkDecls(declaration => {
        properties.push({
            prop: declaration.prop,
            value: declaration.value,
        });
    });
    return properties;
}

function stripClassSelector(selectorPart) {
    if (selectorPart.length === 0) {
        return { class: null, rest: [] };
    }

    const first = selectorPart[0];
    const rest = selectorPart.slice(1);

    if (!(first.type === "attribute" && first.name === "class")) {
        return { class: null, rest: selectorPart };
    }

    return {
        class: first.value,
        rest,
    };
}
