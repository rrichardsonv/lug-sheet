class EzElement extends HTMLElement {
  shadow = null;

  get stylez () {
    return `:host {display: block}`;
  }

  constructor () {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes () {
    return [];
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    this[name] = newValue;
    this.update();
  }

  connectedCallback () {
    this.update();
  }

  update () {
    const nextRender = this.render();
    if (nextRender) {
      this.shadow.innerHTML = nextRender;
    }
    const style = document.createElement('style');
    style.textContent = this.stylez;
    this.shadow.appendChild(style);
  }

  render () { return null; }
}

const pSBC=(p,c0,c1,l)=>{
    let r,g,b,P,f,t,h,i=parseInt,m=Math.round,a=typeof(c1)=="string";
    if(typeof(p)!="number"||p<-1||p>1||typeof(c0)!="string"||(c0[0]!='r'&&c0[0]!='#')||(c1&&!a))return null;
    if(!this.pSBCr)this.pSBCr=(d)=>{
        let n=d.length,x={};
        if(n>9){
            [r,g,b,a]=d=d.split(","),n=d.length;
            if(n<3||n>4)return null;
            x.r=i(r[3]=="a"?r.slice(5):r.slice(4)),x.g=i(g),x.b=i(b),x.a=a?parseFloat(a):-1
        }else{
            if(n==8||n==6||n<4)return null;
            if(n<6)d="#"+d[1]+d[1]+d[2]+d[2]+d[3]+d[3]+(n>4?d[4]+d[4]:"");
            d=i(d.slice(1),16);
            if(n==9||n==5)x.r=d>>24&255,x.g=d>>16&255,x.b=d>>8&255,x.a=m((d&255)/0.255)/1000;
            else x.r=d>>16,x.g=d>>8&255,x.b=d&255,x.a=-1
        }return x};
    h=c0.length>9,h=a?c1.length>9?true:c1=="c"?!h:false:h,f=this.pSBCr(c0),P=p<0,t=c1&&c1!="c"?this.pSBCr(c1):P?{r:0,g:0,b:0,a:-1}:{r:255,g:255,b:255,a:-1},p=P?p*-1:p,P=1-p;
    if(!f||!t)return null;
    if(l)r=m(P*f.r+p*t.r),g=m(P*f.g+p*t.g),b=m(P*f.b+p*t.b);
    else r=m((P*f.r**2+p*t.r**2)**0.5),g=m((P*f.g**2+p*t.g**2)**0.5),b=m((P*f.b**2+p*t.b**2)**0.5);
    a=f.a,t=t.a,f=a>=0||t>=0,a=f?a<0?t:t<0?a:a*P+t*p:0;
    if(h)return"rgb"+(f?"a(":"(")+r+","+g+","+b+(f?","+m(a*1000)/1000:"")+")";
    else return"#"+(4294967296+r*16777216+g*65536+b*256+(f?m(a*255):0)).toString(16).slice(1,f?undefined:-2)
}

function getColorByBgColor(bgColor) {
    if (!bgColor) { return ''; }
    return (parseInt(bgColor.replace('#', ''), 16) > 0xffffff / 2) ? '#000' : '#fff';
}

function normalize(name) {
  return Array.from(name)
  .map(
    (c) =>
      Array.from(c.normalize("NFKD"))
        .filter((s) => s.match(/[\p{L}\d]/u))
        .join("") || "-",
  )
  .join("")
  .replace(
    /(\p{Ll})(\p{Lu})|(\p{Lu})(\p{Lu}\p{Ll})/gu,
    (_match, p1, p2, p3, p4) => `${p1 || p3}-${p2 || p4}`,
  )
  .split(/-+/g)
  .filter((s) => s !== "")
  .join("-")
  .toLowerCase();
};

function hashColor (txt) {
  let hash = 0;
      for (let i = 0; i < txt.length; i++) {
        hash = txt.charCodeAt(i) + ((hash << 5) - hash);
      }
      let color = "#";
      for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += (value.toString(16)).substring(-2);
      }

  return color.slice(0, 7);
}


class GGroup extends EzElement {
  get stylez () {
    return `
    :host section {
      display: inline-block;
      border: 2px solid #000;
    }
    :host h4 {
      margin: 0;
    }
    :host section div {
     display: flex;
     border-top: 3px solid #000;
     border-bottom: 3px solid #000;
     padding: 16px 0;
    }
    `;
  }

  static get observedAttributes () {
    return ['groupnm'];
  }
  
  tagTotals = [];
  
  connectedCallback () {
    super.connectedCallback();
    setTimeout(() => {
      this.recalc();
    }, 50)
  }
  
  recalc () {
    this.tagTotals = this.getTagTotals();
    if (this.tagTotals) {
      this.update();
    }
  }
  
  handleDrop (ev) {
    const node = document.querySelector(ev.dataTransfer.getData("text/plain"));
    const prevParent = node.parentElement;
    this.appendChild(node);
      prevParent.recalc && prevParent.recalc();
      this.recalc();
  }


  getTagTotals () {
    const result = {};
    const colorz = {};
    
    this.querySelectorAll('vql-person').forEach((pp) => {
      console.log(({}.toString).call(pp.getTagz));
      const tagz = pp.getTagz ? pp?.getTagz() : [];
      tagz?.forEach(tag => {
        result[tag.txxt] ??= 0;
        result[tag.txxt]++;

        colorz[tag.txxt] ??= tag._color;
      });
    });

    return Object.entries(result).map(([nm, tot]) => [nm, colorz[nm], tot]);
  }

  renderDetails () {
    const tots = this.tagTotals;
    if (!tots.length) return ``;

    return `
    <style>
      :host .total-list {
        list-style: none;
        margin: 0;
        padding: 0 0 0 26px;
      }

      :host .total-list li::before {
        content: "\u2022";
        font-weight: bold;
        font-size: 24px;
        display: inline-block;
        width: 0.5em;
        margin-left: -1em;
      }
      ${tots.map(([tag, clr]) => `
      :host .total-list .${normalize(tag)}::before {
        color: ${clr};
      }
      `).join('\n')}
    </style>
    <details open="true">
        <summary>details</summary>
        <ul class="total-list">
          ${tots.map(([tag, _, tot]) => `
          <li class="${normalize(tag)}">
            <span><strong>${tag}</strong>&mdash;${tot}</span>
          </li>
          `).join('\n')}
        </ul>
    </details>
    `
  }

  render () {
    return `
    <section>
      <header>
        <h4>${this.groupnm}</h4>
      </header>
      <div>
        <slot></slot>
      </div>
      ${this.renderDetails()}
    </section>`;
  }
}

class PPerson extends EzElement {
  get stylez () {
    return `
    :host div {
      display: inline-block;
      border: 2px solid #ccc;
    background: #f2f2f2;
    }
    :host p {
      margin: 0;
    }
    `;
  }
  static get observedAttributes () {
    return ['params', 'firstname', 'lastname'];
  }

  getTagz () {
    return Array.from(this.querySelectorAll('vql-tag'));
  }

  render () {
    return `<div>
      <p>${this.firstname} ${this.lastname}</p>
      <slot name="tags"></slot>
    </div>
    `;
  }
}

class TTag extends EzElement {
  static get observedAttributes () {
    return ['txxt'];
  }
  
  _color = "#ccc";

  attributeChangedCallback (name, oldVal, newVal) {
    if (String(name) === "txxt") {
      this._color = hashColor(newVal); 
    }
    super.attributeChangedCallback(name, oldVal, newVal);
  }
  
  recalcColor () {
    this._color = hashColor(this.getAttribute('txxt'));
    this.update();
  }

  render () {
    const bgColor = pSBC(0.4, this._color),
          borderColor = pSBC(-0.1, this._color),
          txtColor = getColorByBgColor(bgColor);

    return `<small style="background-color: ${bgColor};border: 2px solid ${borderColor}; color: ${txtColor}">${this.getAttribute('txxt')}</small>`;
  }
}


customElements.define("vql-group", GGroup);
customElements.define("vql-person", PPerson);
customElements.define("vql-tag", TTag);


document.addEventListener('dragstart', (ev) => {
  if (ev.target.tagName === "VQL-PERSON") {
    ev.dataTransfer.setData("text/plain", `vql-person[firstname="${ev.target.firstname}"][lastname="${ev.target.lastname}"]`);
    ev.dataTransfer.effectAllowed = "move";
  }
});

function handleDragover (ev) {
 ev.preventDefault();
 ev.dataTransfer.dropEffect = "move"
}