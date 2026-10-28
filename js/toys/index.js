// Registry of SLUR Lab tools. Each module exports mount(el, { compact, entry }) -> { unmount }
export const GROUPS = {
  eye: { icon: '👁', name: 'ตากับกล้อง' },
  ear: { icon: '👂', name: 'หูกับเสียง' },
  body: { icon: '🫀', name: 'ร่างกาย' },
  mind: { icon: '🧠', name: 'สมองกับความเชื่อ' },
  world: { icon: '🏚', name: 'บ้านกับธรรมชาติ' },
};

export const TOYS = {
  'sleep-paralysis': { group: 'body', title: 'ตื่นผิดจังหวะ', topic: 'ผีอำ (Sleep paralysis)', tag: 'sleep', blurb: 'ลองตื่นในช่วงต่างๆ ของการนอน แล้วดูว่าทำไมบางครั้งตาเปิดแต่ตัวขยับไม่ได้' },
  infrasound: { group: 'ear', title: 'ทางเดิน 19 เฮิรตซ์', topic: 'เสียงที่หูไม่ได้ยิน (Infrasound)', tag: 'infrasound', blurb: 'ปรับความยาวทางเดินกับความถี่พัดลม แล้วหาจุดที่อากาศ "สั่นพ้อง"' },
  pareidolia: { group: 'eye', title: 'หน้าในกำแพง', topic: 'สมองเห็นหน้า (Pareidolia)', tag: 'pareidolia', blurb: 'สุ่มผนังปูน แล้วแข่งกับคอมพิวเตอร์ว่าใครเห็น "หน้า" มากกว่ากัน' },
  'co-house': { group: 'body', title: 'บ้านที่ทำให้เห็นผี', topic: 'ก๊าซคาร์บอนมอนอกไซด์', tag: 'co', blurb: 'เปิดเครื่องทำน้ำอุ่นแก๊สในห้องปิด แล้วดูว่า CO ในเลือดขึ้นเร็วแค่ไหน' },
  ouija: { group: 'mind', title: 'ใครขยับแก้ว', topic: 'ผีถ้วยแก้ว (Ideomotor effect)', tag: 'ideomotor', blurb: 'แรงเล็กๆ ที่เราไม่รู้ตัวของหลายคน รวมกันแล้วพาแก้วไปไหน' },
  krasue: { group: 'world', title: 'แสงลอยกลางหนอง', topic: 'ไฟผีกระสือ (Will-o\'-the-wisp)', tag: 'wisp', blurb: 'แก๊สจากซากพืชเน่าใต้หนองน้ำ ติดไฟเองแล้วลอยหนีเราได้ยังไง' },
  coincidence: { group: 'mind', title: 'ฝันแล้วเป็นจริง?', topic: 'ความบังเอิญ (Birthday paradox)', tag: 'coincidence', blurb: 'ต้องมีกี่คนในห้อง ถึงจะมีคนวันเกิดชนกัน แล้วคืนนี้จะมีกี่คนที่ฝันแม่น' },
  brocken: { group: 'eye', title: 'ยักษ์ในหมอก', topic: 'Brocken spectre', tag: 'brocken', blurb: 'เงาของเราบนกำแพงหมอก กับวงรุ้งที่มีแต่เจ้าของเงาเท่านั้นที่เห็น' },
  bayes: { group: 'mind', title: 'เห็นผี = มีผี?', topic: 'ทฤษฎีของเบย์ (Bayes)', tag: 'ghost', blurb: 'ถ้ามีคนบอกว่าเห็นผี โอกาสที่จะมีผีจริงๆ คือเท่าไหร่' },
  // ---- added 2026-10-28 ----
  orbs: { group: 'eye', title: 'ลูกแก้ววิญญาณในรูป', topic: 'ฝุ่นสะท้อนแฟลช (Orbs)', tag: 'camera', blurb: 'ถ่ายรูปห้องมืดด้วยแฟลช แล้วดูว่าฝุ่นหน้าเลนส์กลายเป็นวงกลมลอยๆ ได้ยังไง' },
  'long-exposure': { group: 'eye', title: 'ผีโปร่งแสงในรูป', topic: 'เปิดชัตเตอร์นาน & ถ่ายซ้อน', tag: 'camera', blurb: 'คนที่ยืนอยู่แค่ครึ่งเวลาของชัตเตอร์ กลายเป็นร่างโปร่งใสที่มองทะลุได้' },
  afterimage: { group: 'eye', title: 'ผีติดตา', topic: 'ภาพติดตา (Afterimage)', tag: 'eye', blurb: 'จ้องร่างสีแดง 20 วินาที แล้วหันไปมองผนัง ผีสีฟ้าจะลอยตามสายตาไป' },
  troxler: { group: 'eye', title: 'เงาที่หางตา', topic: 'Troxler fading', tag: 'eye', blurb: 'จ้องกากบาทนิ่งๆ แล้วเงารอบๆ จะหายไป พอกลอกตามันก็โผล่กลับมา' },
  echo: { group: 'ear', title: 'เสียงเดินชั้นบน', topic: 'เสียงสะท้อน (Echo)', tag: 'echo', blurb: 'เสียงฝีเท้าเราเองสะท้อนลงมาจากช่องบันได ฟังเหมือนมีคนเดินตาม' },
  whistle: { group: 'ear', title: 'ตึกที่ร้องไห้', topic: 'การสั่นพ้องของโพรงอากาศ (Helmholtz)', tag: 'draft', blurb: 'ลมพัดผ่านหน้าต่าง ห้อง หรือท่อ แล้วอากาศข้างในร้องเป็นเสียงหวีดหรือครางต่ำ' },
  emf: { group: 'world', title: 'เครื่องจับผี EMF', topic: 'สนามแม่เหล็กจากไฟบ้าน', tag: 'emf', blurb: 'ลากเครื่องวัดไปรอบห้อง แล้วดูว่า "ผี" ที่เครื่องเจอคือสายไฟกับตู้เย็น' },
  pendulum: { group: 'world', title: 'โคมไฟแกว่งเอง', topic: 'การสั่นพ้อง (Resonance)', tag: 'resonance', blurb: 'แรงสั่นเบาๆ ที่ตรงจังหวะพอดี ทำให้โคมไฟแกว่งกว้างขึ้นเรื่อยๆ ทั้งที่ไม่มีใครแตะ' },
  door: { group: 'world', title: 'ประตูปิดเอง', topic: 'บานพับเอียง & แรงดันลม', tag: 'draft', blurb: 'วงกบเอียงแค่ 1 องศากับลมเบาๆ จากหน้าต่าง พอให้ประตูหนักๆ ปิดดังปัง' },
  mirage: { group: 'world', title: 'เรือลอยฟ้า', topic: 'ภาพลวงตาเหนือทะเล (Fata Morgana)', tag: 'mirage', blurb: 'ตามเส้นทางแสงผ่านชั้นอากาศอุ่น แล้วดูเรือที่ไกลเกินขอบฟ้าลอยขึ้นมากลับหัว' },
  witness: { group: 'mind', title: 'พยานเห็นผี', topic: 'ความจำเพี้ยน (Misinformation effect)', tag: 'memory', blurb: 'ดูห้องหกวินาทีแล้วตอบคำถาม คำถามชี้นำทำให้จำผู้หญิงที่ไม่มีอยู่จริงได้' },
  barnum: { group: 'mind', title: 'หมอดูรู้ใจ', topic: 'ปรากฏการณ์บาร์นัม (Forer effect)', tag: 'barnum', blurb: 'ให้ดวงวิญญาณทำนายนิสัย แล้วให้คะแนนว่าแม่นแค่ไหน ก่อนจะรู้ความจริง' },
  epidemic: { group: 'body', title: 'ห่าลง', topic: 'โรคระบาด (แบบจำลอง SIR)', tag: 'disease', blurb: 'ทำไมผีห่าถึงกินคนเป็นหมื่นในไม่กี่สัปดาห์ แล้วหายไปเอง' },
  windchill: { group: 'body', title: 'หนาวจนคลั่ง', topic: 'ภาวะตัวเย็นเกิน (Hypothermia)', tag: 'cold', blurb: 'ลมกับความหนาวทำอะไรกับร่างกายและสมอง จนคนถอดเสื้อผ้าเดินออกไปในหิมะ' },
};

export async function mountToy(name, host, opts = {}) {
  if (!TOYS[name]) throw new Error('unknown tool ' + name);
  const m = await import(`./${name}.js`);
  const api = m.mount(host, { name, ...TOYS[name], ...opts });
  host.querySelectorAll('details.more').forEach((d) => { if (!d.lastElementChild.childElementCount) d.hidden = true; });
  return api;
}
