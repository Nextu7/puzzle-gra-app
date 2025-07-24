if (!customElements.get('show-more-button')) {
  customElements.define('show-more-button', class ShowMoreButton extends HTMLElement {
    constructor() {
      super();
      this.querySelector('button').addEventListener('click', () => {
        // 1. Znajdź wrapper z filtrem
        const parentDisplay = this.closest('.parent-display');
        if (!parentDisplay) return;

        // 2. To on ma overflow—zachowaj scrollTop
        const prevScroll = parentDisplay.scrollTop;

        // 3. Toggle etykiet przycisku
        this.querySelectorAll('.label-text').forEach(el => el.classList.toggle('hidden'));

        // 4. Pokaż/ukryj elementy z klasą show-more-item
        parentDisplay.querySelectorAll('.show-more-item').forEach(item => {
          item.classList.toggle('hidden');
        });

        // 5. Przywróć scroll
        parentDisplay.scrollTop = prevScroll;

        // 6. Jeśli nie ma już "Pokaż mniej", schowaj cały komponent
        if (!this.querySelector('.label-show-less')) {
          this.classList.add('hidden');
        }
      });
    }
  });
}
