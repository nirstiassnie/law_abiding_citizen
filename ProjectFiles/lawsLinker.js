let found_laws_counter = 0;
var POTENTIAL_LAW_LENGTH = 50;




// Return true if letter is an hebrew AlephBet letter and false otherwise.
function isAlephBet(letter){
    if( "א".charCodeAt(0) <= letter.charCodeAt(0) && letter.charCodeAt(0) <= "ת".charCodeAt(0)){
        return true;
    }
    return false;
}


// Given a set of laws, return the law with the most recent date.
function getRecentLaw(findings, potentialLaw, i){
    let maxDate = new Date("1800-01-01"); 
    let recentLaw = {};
    findings.forEach(law => {
        let currLawDate = new Date(law["PublicationDate"])
        if(currLawDate > maxDate){
            recentLaw = law ;
            maxDate = currLawDate;
        }
    });

    // Trim the space in the end of the (soon to be) link.
    let index = i-1;
    if(potentialLaw.charAt(i-1).localeCompare(" ") == 0){
        index = i-2;
    }
    recentLaw["lawLengthInText"] = index;
    return recentLaw;
}


// Given a set of laws (findings) returning one law whose the best match for potentialLaw.
function reduceToOneLaw(potentialLaw, findings, findingsPrev, i){

    // findings is an empty set, find the best match in findingsPrev.
    if(findings.length == 0){
        // i-2 is the character that made the reduction to 0 laws.
        if(isAlephBet(potentialLaw.charAt(i-2)) && potentialLaw.charAt(i-3).localeCompare(' ') != 0){
            // The character that made it not a prefix (i-2) is a letter on the hebrew Alephabet and
            // the letter before is not a space, this is not a valid prefix.
            return null;
        }
        return getRecentLaw(findingsPrev, potentialLaw, i-1);
    } 

    // i exceeded potentialLaw length, return the best match so far.
    if(i > potentialLaw.length){
        return getRecentLaw(findings, potentialLaw, i);
    }

    // potentialLaw has exactly 1 match.
    if(findings.length == 1){

        // i++ as long as potentialLaw up to i is a prefix of the single law.
        if(findings[0]["OfficialName"].startsWith(potentialLaw.substring(i+1))){
            return reduceToOneLaw(potentialLaw, findings, findings, i+1);
        }

        // If the characther that "ruined" the match is an AlephBet letter and the letter before it is 
        // not a space, then there is no match.
        if(isAlephBet(potentialLaw.charAt(i-1)) && potentialLaw.charAt(i-2).localeCompare(' ') != 0){
            return null;
        }

        // Trim the space in the end of the link.
        let index = i-1;
        if(potentialLaw.charAt(i-1).localeCompare(" ") == 0 && potentialLaw.charAt(i-1)){
            index = i-2;
        }
        findings[0]["lawLengthInText"] = index;
        return findings[0];
    }

    // Update findings by taking one more letter from potentialLaw. 
    let nextFindings = [];
    findings.forEach(law => {
        if(law["OfficialName"].startsWith(potentialLaw.substring(0, i))){
            nextFindings.push(law);
        }
    })
    return reduceToOneLaw(potentialLaw, nextFindings, findings, i+1)
}


// Check whether potentialLaw is a law in the data set.
function isLaw(potentialLaw, data){
    let findings = [];
    let lawDict = null;
    data.forEach(law => {
        if(law["OfficialName"].startsWith(potentialLaw.substring(0, 7))){
            findings.push(law);
        }
    });
    if(findings.length > 0){
        lawDict = reduceToOneLaw(potentialLaw, findings, null, 8);
    }
    return lawDict;
}


// Modify element in the DOM from being plain text to containing a link in the i-th location.
function addLawTag(i, element, lawDict){
    let lawLengthInText = lawDict["lawLengthInText"]
    let text = element.nodeValue;
    let preText = text.substring(0,i);
    let lawText = text.substring(i,i+lawLengthInText);
    let sufText = text.substring(i+lawLengthInText, text.length);

    let preTextNode = document.createTextNode(preText);
    let lawTextNode = document.createTextNode(lawText);
    let sufTextNode = document.createTextNode(sufText);

    let lawLinkNode = document.createElement("a");

    if(!lawDict["KnessetUrl"] && !lawDict["OpenLawBook"]){
        return;
    }
    let url = lawDict["KnessetUrl"] ? lawDict["KnessetUrl"] : lawDict["OpenLawBook"]["OpenLawBookUrl"];

    lawLinkNode.setAttribute('href', url);
    lawLinkNode.appendChild(lawTextNode);
    let parentNode = element.parentNode;

    if (parentNode != null){
        parentNode.replaceChild(sufTextNode, element);
        parentNode.insertBefore(lawLinkNode, sufTextNode);
        parentNode.insertBefore(preTextNode, lawLinkNode);
        console.log(`Found law: ${lawDict["OfficialName"].substring(0,lawDict["lawLengthInText"])}, Added Link: ${url}`)
    }
}


// Find laws inside the given text and make a link out of them.
function insideText(element, data){
    // Element is a TextNode which contains only the text inside the paragraph.
    let text = element.nodeValue;
    let i = text.indexOf("חוק");
    while(i != -1){
        let potentialLaw = text.substring(i, Math.min(i + POTENTIAL_LAW_LENGTH, text.length-1));
        if(potentialLaw.length >= 7){
            // Returns null if there is no such law, dict if there is.
            let lawDict = isLaw(potentialLaw, data);
            if(lawDict){
                linkAdded = addLawTag(i, element, lawDict);
                found_laws_counter++;
            }
        }
        i = text.indexOf("חוק ", i+1);
    }
}


// Traverse every text in a paragraph.
function pHandler(childrenArr, data){
    for(let i=0; i<childrenArr.length; i++){
        if(childrenArr[i].nodeType == 3){
            insideText(childrenArr[i], data)
        }
    }
}


// Traverse every paragraph in the page.
function pArrHandler(pArr, data){
    for(let i=0; i<pArr.length; i++){
        pHandler(pArr[i].childNodes, data)
    }
}

// Main function of script.
function findLawsAndMakeLinks(){
    let jsonUrl = chrome.extension.getURL("laws_data_set.json");
    $.getJSON(jsonUrl, function(data) { 
                tags = document.body.getElementsByTagName("p");
                pArrHandler(tags, data);
                alert(`Found ${found_laws_counter} laws`)
            });
}

findLawsAndMakeLinks();