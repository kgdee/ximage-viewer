const StickersModal = (() => {
  const element = document.querySelector(".stickers-modal");
  const itemsGrid = element.querySelector(".items-grid");

  function updateUI() {
    itemsGrid.innerHTML =
      currentStickers
        .map(
          (item, i) => `
            <div class="item" onclick="appendSticker(${i})">
              <img src="${item.imageUrl}">
              <div class="name">${item.name}</div>
            </div>
          `,
        )
        .join("") || `<div class="message">No stickers</div>`;
  }

  async function handleAdd(files) {
    await addStickers(files);
    updateUI();
  }

  async function handleReset() {
    await resetStickers();
    updateUI();
  }

  function open() {
    updateUI();
    element.classList.toggle("hidden", false);
  }

  function close() {
    element.classList.toggle("hidden", true);
  }

  return { open, close, handleAdd, handleReset };
})();
