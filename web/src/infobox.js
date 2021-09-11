import { el, unmount } from 'redom';

class InfoBox {
  constructor (title) {
    this.content = el('div', {'class': 'infobox-content'});
    const closebutton = el('a', '×');
    const header = el('div', title, closebutton, {'class': 'infobox-header'});

    this.el = el('div', header, this.content, {'class': 'infobox'});

    closebutton.onclick = (e) => {
      unmount(document.body, this.el);
      e.preventDefault();
    }
  }

  update(data) {
    this.content.innerHTML = data;
  }
}

export default InfoBox;
