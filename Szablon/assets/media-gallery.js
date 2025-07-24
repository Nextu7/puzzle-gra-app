if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.mql = window.matchMedia('(min-width: 750px)');
        if (!this.elements.thumbnails) return;
        
        // Dodaj flagę inicjalizacji
        this.isInitialized = false;
        
        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
        });
        if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
        
        // Opóźnij inicjalizację, aby upewnić się, że DOM jest gotowy
        requestAnimationFrame(() => {
          this.initializeMediaPositions();
          this.preventInitialAnimation();
        });
        
        window.addEventListener('resize', debounce(() => {
          if (this.isInitialized) {
            this.initializeMediaPositions();
          }
        }, 100));
      }
      
      preventInitialAnimation() {
        // Zapobiegaj animacji przy pierwszym ładowaniu
        const slider = this.elements.viewer.querySelector('[id^="Slider-Gallery"]');
        if (slider) {
          slider.style.transition = 'none';
          
          // Przywróć animację po krótkiej chwili
          setTimeout(() => {
            slider.style.transition = '';
            slider.classList.add('initialized');
            this.classList.add('media-gallery-initialized');
            this.isInitialized = true;
          }, 100);
        }
      }
      
      initializeMediaPositions() {
        const allMedia = this.elements.viewer.querySelectorAll('[data-media-id]');
        if (!allMedia.length) return;
        
        // Ukryj wszystkie media na początku
        const slider = this.elements.viewer.querySelector('[id^="Slider-Gallery"]');
        if (slider && !this.isInitialized) {
          slider.style.opacity = '0';
        }
        
        // Znajdź aktywne media (pierwsze z klasą is-active)
        let activeMedia = this.elements.viewer.querySelector('.is-active');
        
        // Jeśli nie ma aktywnego media, ustaw pierwsze jako aktywne
        if (!activeMedia) {
          activeMedia = allMedia[0];
          activeMedia.classList.add('is-active');
        }
        
        const activeIndex = Array.from(allMedia).indexOf(activeMedia);
        
        // Dla desktop z thumbnail layout
        if (this.mql.matches && this.dataset.desktopLayout?.includes('thumbnail')) {
          allMedia.forEach((element, index) => {
            // Ustaw transform dla wszystkich elementów
            const offset = (index - activeIndex) * 100;
            element.style.transform = `translateX(${offset}%)`;
            element.style.transition = this.isInitialized ? 'transform 0.4s ease' : 'none';
          });
        } else {
          // Dla mobile/tablet - przewiń do aktywnego elementu bez animacji
          if (!this.isInitialized && activeMedia) {
            const scrollContainer = activeMedia.parentElement;
            scrollContainer.scrollTo({ left: activeMedia.offsetLeft, behavior: 'auto' });
          }
        }
        
        // Pokaż media po ustawieniu pozycji
        if (slider && !this.isInitialized) {
          setTimeout(() => {
            slider.style.opacity = '1';
          }, 50);
        }
        
        // Upewnij się, że thumbnail jest również zsynchronizowany
        if (this.elements.thumbnails && activeMedia) {
          const mediaId = activeMedia.dataset.mediaId;
          const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
          if (activeThumbnail) {
            this.setActiveThumbnail(activeThumbnail);
          }
        }
      }
      
      onSlideChanged(event) {
        if (!event.detail || !event.detail.currentElement) return;
        const thumbnail = this.elements.thumbnails.querySelector(
          `[data-target="${event.detail.currentElement.dataset.mediaId}"]`
        );
        this.setActiveThumbnail(thumbnail);
      }
      
      setActiveMedia(mediaId, prepend) {
        const activeMedia =
          this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');
        if (!activeMedia) {
          return;
        }
        
        const allMedia = this.elements.viewer.querySelectorAll('[data-media-id]');
        const targetIndex = Array.from(allMedia).indexOf(activeMedia);
        
        allMedia.forEach((element, index) => {
          element.classList.remove('is-active');
          if (this.mql.matches && this.dataset.desktopLayout?.includes('thumbnail')) {
            const offset = (index - targetIndex) * 100;
            element.style.transform = `translateX(${offset}%)`;
            // Używaj animacji tylko jeśli galeria jest już zainicjalizowana
            element.style.transition = this.isInitialized ? 'transform 0.4s ease' : 'none';
          }
        });
        activeMedia?.classList?.add('is-active');
        
        if (prepend) {
          activeMedia.parentElement.firstChild !== activeMedia && activeMedia.parentElement.prepend(activeMedia);
          if (this.elements.thumbnails) {
            const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
            activeThumbnail.parentElement.firstChild !== activeThumbnail && activeThumbnail.parentElement.prepend(activeThumbnail);
          }
          if (this.elements.viewer.slider) this.elements.viewer.resetPages();
        }
        
        this.preventStickyHeader();
        
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            const behavior = this.isInitialized ? 'smooth' : 'auto';
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft, behavior: behavior });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
          window.scrollTo({ top: top, behavior: 'smooth' });
        });
        
        this.playActiveMedia(activeMedia);
        
        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
      }
      
      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail) return;
        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;
        
        const behavior = this.isInitialized ? 'smooth' : 'auto';
        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft, behavior: behavior });
      }
      
      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }
      
      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }
      
      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }
      
      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}