const dropArea = document.getElementById("drop-area");
const inputScreen = document.querySelector(".input-screen");
const imageInput = inputScreen.querySelector(".image-input input");
const imageScreen = document.querySelector(".image-screen");
const viewport = document.querySelector(".viewport");
const imageBoard = document.querySelector(".image-board");
const imageContainer = document.querySelector("#image-container");
const imageEl = imageContainer.querySelector("img");
const overlayImagesEl = document.querySelector(".overlay-images");
const panzoomArea = document.getElementById("panzoom-area");
const controlBar = document.querySelector(".control-bar");

let currentFiles = [];
let currentFile = -1;
let isImageDisplayed = false;
let jitterInterval = null;
let isAnimating = false;
let animationDuration = 0;
let panzooms = [];
let activeImageEl = imageBoard;
let isPanMode = false;

document.addEventListener("DOMContentLoaded", () => {
  applyPanzoom(imageBoard);
  panzooms[0].setOptions({ disablePan: false, disableZoom: false });
});

function applyPanzoom(el) {
  const panzoom = Panzoom(el, {
    minScale: 0.1,
    maxScale: 10,
    contain: false,
    cursor: "grab",
    disablePan: true,
    disableZoom: true,
  });

  panzooms.push(panzoom);
  el.addEventListener("wheel", panzoom.zoomWithWheel);

  el.addEventListener("pointerdown", (e) => {
    panzooms.forEach((panzoom) => {
      panzoom.setOptions({ disablePan: true, disableZoom: true });
    });
    panzoom.setOptions({ disablePan: false, disableZoom: false });
    activeImageEl = el;
  });

  panzoom.pan(0, 0);
  panzoom.zoom(1);
  el.parentElement.style.overflow = "visible";
  el.style.overflow = "visible";
}

function togglePanMode(force) {
  isPanMode = force !== undefined ? force : !isPanMode;
  overlayImagesEl.style.pointerEvents = isPanMode ? "none" : null;
  panzooms[0].setOptions({ disablePan: !isPanMode, disableZoom: !isPanMode });
  document.querySelector(".pan-mode-btn").innerHTML = isPanMode ? `<i class="bi bi-lock"></i>` : `<i class="bi bi-unlock"></i>`;
}

function fitImage() {
  if (!isImageDisplayed) return;
  panzooms[0].pan(0, 0);
  panzooms[0].zoom(1);
}

function handleDrop(event) {
  event.preventDefault();

  const files = event.dataTransfer.files;
  handleFiles(files);
}

function handleFiles(files) {
  if (files.length <= 0) return;

  files = Array.from(files);
  currentFiles = files.filter((file) => file.type.startsWith("image/"));
  currentFiles = shuffle(currentFiles);

  displayImage(0);
  toggleFullscreen(true);
}

async function displayImage(direction = 0, shouldStopAnimation = true) {
  if (shouldStopAnimation && animationDuration) stopAnimation();

  direction = Math.sign(direction);

  let fileIndex = 0;
  if (direction) {
    fileIndex = wrap(currentFile + direction, 0, currentFiles.length - 1);
  }

  currentFile = fileIndex;
  const file = currentFiles[currentFile];
  imageInput.value = "";
  const imageUrl = await getFileDataUrl(file);
  await setImageSrc(imageEl, imageUrl);
  changeScreen("image-screen");
  isImageDisplayed = true;
  fitImage();
  document.querySelector(".bg-image").style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
}

function goHome() {
  if (animationDuration) stopAnimation();

  changeScreen("input-screen");
  imageEl.src = "";
  isImageDisplayed = false;
  toggleFullscreen(false);
}

function toggleAnimation() {
  if (!isImageDisplayed) return;

  isAnimating = true;
  animationDuration = cycle(animationDuration);

  toggleJitter(true, { x: 2, y: 5 });
  imageBoard.style.animation = animationDuration > 0 ? `bounce ${animationDuration}s ease-in-out infinite` : null;
  imageBoard.style.pointerEvents = "none";
  toggleControlBar(false);
  togglePanMode(true);
}

function stopAnimation() {
  isAnimating = false;
  animationDuration = 0;
  imageBoard.style.animation = null;
  imageBoard.style.pointerEvents = null;
  toggleJitter(false);
  toggleControlBar(true);
}

function toggleJitter(force = true, transform = {}) {
  if (!isImageDisplayed || animationDuration > 0) return;

  const { x, y, scale } = transform;

  if (force) {
    clearInterval(jitterInterval);
    jitterInterval = setInterval(() => jitter(x, y, scale), 500);
    viewport.style.transition = "1s";
  } else {
    clearInterval(jitterInterval);
    viewport.style.transform = null;
    viewport.style.transition = null;
  }
}

function jitter(strengthX = 10, strengthY = 10, scale = 1) {
  const x = Math.random() * strengthX;
  const y = Math.random() * strengthY;
  const newScale = scale + Math.random() * 0.02;

  viewport.style.transform = `translate(${x}px, ${y}px) scale(${newScale})`;
}

function moveImage(x, y) {
  panzooms[0].pan(x, y, { relative: true });
}

function toggleControlBar(force) {
  const shouldHide = force !== undefined ? !force : undefined;
  controlBar.classList.toggle("sm-hidden", shouldHide);
}

async function addOverlayImages(files) {
  files = Array.from(files);

  for (const file of files) {
    const imageUrl = await getFileDataUrl(file);
    const imageEl = document.createElement("div");
    imageEl.className = "overlay-image";
    imageEl.innerHTML = `
      <div>
        <img src="${imageUrl}">
      </div>`;
    overlayImagesEl.appendChild(imageEl);
    applyPanzoom(imageEl.lastElementChild);
  }

  document.querySelector(".add-overlay-btn").classList.toggle("hidden", true);
  document.querySelector(".remove-overlay-btn").classList.toggle("hidden", false);
}

function removeOverlayImages() {
  overlayImagesEl.innerHTML = "";
  panzooms.length = 1;

  document.querySelector(".add-overlay-btn").classList.toggle("hidden", false);
  document.querySelector(".remove-overlay-btn").classList.toggle("hidden", true);
}

function rotateImage(direction = 1, value = 3) {
  const current = parseFloat(activeImageEl.firstElementChild.style.rotate) || 0;
  const total = current + (direction > 0 ? value : -value);
  activeImageEl.firstElementChild.style.rotate = `${total}deg`;
}

viewport.addEventListener("click", async () => {
  toggleControlBar();
  if (isAnimating) toggleAnimation();
});

const keyActions = {
  Space: () => displayImage(currentFile + 1),
  KeyF: toggleFullscreen,
  KeyC: fitImage,
  KeyA: toggleAnimation,
  Equal: () => zoom(-1),
  BracketRight: () => zoom(-1),
  Minus: () => zoom(1),
  BracketLeft: () => zoom(1),
  ArrowUp: () => moveImage(0, -10),
  ArrowDown: () => moveImage(0, 10),
  ArrowLeft: () => moveImage(-10, 0),
  ArrowRight: () => moveImage(10, 0),
};

document.addEventListener("keydown", (event) => {
  const action = keyActions[event.code];
  if (action) {
    event.preventDefault();
    action();
  }
});
