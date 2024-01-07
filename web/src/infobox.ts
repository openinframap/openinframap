import { el, unmount } from "redom";

class InfoBox {
  content: HTMLDivElement;
  el: HTMLDivElement;
  constructor(title: string) {
    this.content = el("div", { class: "infobox-content" });
    const closebutton = el("a", "×");
    const header = el("div", title, closebutton, { class: "infobox-header" });

    this.el = el("div", header, this.content, { class: "infobox" });

    closebutton.onclick = (e) => {
      unmount(document.body, this.el);
      e.preventDefault();
    };
  }

  update(data: string) {
    this.content.innerHTML = data;
  }
}

export default InfoBox;
