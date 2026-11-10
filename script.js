const fullPath = window.location.pathname;
const pathSegments = fullPath.replace(/\/+&/, "").split("/").filter(Boolean);
const requestedWord = pathSegments.length > 1 ? pathSegments.pop() : "";
const cleanWord = decodeURIComponent(requestedWord);

const displayElement = document.getElementById("word-display");
if (displayElement) {
    displayElement.textContent = cleanWord || "No word found";
}