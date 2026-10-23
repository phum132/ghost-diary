// Registry of SLUR Lab tools. Each module exports mount(el, { compact, entry }) -> { unmount }
export const TOYS = {
  'sleep-paralysis': { title: 'ตื่นผิดจังหวะ', topic: 'ผีอำ (Sleep paralysis)', tag: 'sleep', blurb: 'ลองตื่นในช่วงต่างๆ ของการนอน แล้วดูว่าทำไมบางครั้งตาเปิดแต่ตัวขยับไม่ได้' },
  infrasound: { title: 'ทางเดิน 19 เฮิรตซ์', topic: 'เสียงที่หูไม่ได้ยิน (Infrasound)', tag: 'infrasound', blurb: 'ปรับความยาวทางเดินกับความถี่พัดลม แล้วหาจุดที่อากาศ "สั่นพ้อง"' },
  pareidolia: { title: 'หน้าในกำแพง', topic: 'สมองเห็นหน้า (Pareidolia)', tag: 'pareidolia', blurb: 'สุ่มผนังปูน แล้วแข่งกับคอมพิวเตอร์ว่าใครเห็น "หน้า" มากกว่ากัน' },
  'co-house': { title: 'บ้านที่ทำให้เห็นผี', topic: 'ก๊าซคาร์บอนมอนอกไซด์', tag: 'co', blurb: 'เปิดเครื่องทำน้ำอุ่นแก๊สในห้องปิด แล้วดูว่า CO ในเลือดขึ้นเร็วแค่ไหน' },
  ouija: { title: 'ใครขยับแก้ว', topic: 'ผีถ้วยแก้ว (Ideomotor effect)', tag: 'ideomotor', blurb: 'แรงเล็กๆ ที่เราไม่รู้ตัวของหลายคน รวมกันแล้วพาแก้วไปไหน' },
  krasue: { title: 'แสงลอยกลางหนอง', topic: 'ไฟผีกระสือ (Will-o\'-the-wisp)', tag: 'wisp', blurb: 'แก๊สจากซากพืชเน่าใต้หนองน้ำ ติดไฟเองแล้วลอยหนีเราได้ยังไง' },
  coincidence: { title: 'ฝันแล้วเป็นจริง?', topic: 'ความบังเอิญ (Birthday paradox)', tag: 'coincidence', blurb: 'ต้องมีกี่คนในห้อง ถึงจะมีคนวันเกิดชนกัน แล้วคืนนี้จะมีกี่คนที่ฝันแม่น' },
  brocken: { title: 'ยักษ์ในหมอก', topic: 'Brocken spectre', tag: 'brocken', blurb: 'เงาของเราบนกำแพงหมอก กับวงรุ้งที่มีแต่เจ้าของเงาเท่านั้นที่เห็น' },
  bayes: { title: 'เห็นผี = มีผี?', topic: 'ทฤษฎีของเบย์ (Bayes)', tag: 'ghost', blurb: 'ถ้ามีคนบอกว่าเห็นผี โอกาสที่จะมีผีจริงๆ คือเท่าไหร่' },
};

export async function mountToy(name, host, opts = {}) {
  if (!TOYS[name]) throw new Error('unknown tool ' + name);
  const m = await import(`./${name}.js`);
  return m.mount(host, { name, ...TOYS[name], ...opts });
}
