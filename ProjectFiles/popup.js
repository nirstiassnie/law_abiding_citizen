var enabled = false; //disabled by default
var myButton = document.getElementById('clickme');


myButton.onclick = () => {
    // enabled = !enabled;
    // myButton.textContent = enabled ? 'Disable' : 'Enable';
    // chrome.storage.local.set({enabled:enabled});
    chrome.tabs.executeScript({
        file: 'lawsLinker.js'
      }); 
};

