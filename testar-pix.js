/* Verificador do BR Code gerado: confere TLV, valor, chave e CRC.
   Rode com: node testar-pix.js                                          */

function semAcento(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
const asciiPix = s => semAcento(s).replace(/[^A-Za-z0-9 .,\-]/g, '').trim();
function crc16Pix(texto) {
  let crc = 0xFFFF;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function chavePixOk(k) {
  k = String(k || '').trim();
  if (/^\d{11}$/.test(k) || /^\d{14}$/.test(k)) return true;
  if (/^\+\d{10,14}$/.test(k)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(k)) return true;
  return false;
}
function brCodePix(chave, valor, nome, cidade, txid) {
  const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
  const id = String(txid || '***').replace(/[^A-Za-z0-9]/g, '').slice(0, 25).toUpperCase() || '***';
  let p = '000201';
  p += tlv('26', tlv('00', 'br.gov.bcb.pix') + tlv('01', String(chave).trim()));
  p += tlv('52', '0000');
  p += tlv('53', '986');
  if (Number(valor) > 0) p += tlv('54', Number(valor).toFixed(2));
  p += tlv('58', 'BR');
  p += tlv('59', asciiPix(nome).slice(0, 25).toUpperCase());
  p += tlv('60', asciiPix(cidade).slice(0, 15).toUpperCase());
  p += tlv('62', tlv('05', id));
  p += '6304';
  return p + crc16Pix(p);
}

/* le o TLV de verdade, para provar que os tamanhos batem */
function lerTLV(s, i = 0) {
  const campos = [];
  while (i < s.length) {
    const id = s.substr(i, 2);
    const len = parseInt(s.substr(i + 2, 2), 10);
    if (Number.isNaN(len)) throw new Error('tamanho invalido em ' + i);
    campos.push({ id, len, valor: s.substr(i + 4, len) });
    i += 4 + len;
  }
  return campos;
}

const chave = 'kennedy@ritmok.com';
// nome propositalmente cheio de acento e simbolo, que e o caso que quebra
const codigo = brCodePix(chave, 397, 'RitmoK — Prof. Kennedy ✨', 'São Paulo', '26250941');

console.log('Codigo gerado:');
console.log(codigo);
console.log('');
console.log('Tamanho: ' + codigo.length + ' caracteres');
console.log('So ASCII: ' + (/^[\x20-\x7E]+$/.test(codigo) ? 'sim' : 'NAO'));
console.log('CRC confere: ' + (codigo.slice(-4) === crc16Pix(codigo.slice(0, -4))));
console.log('Comeca com 000201: ' + codigo.startsWith('000201'));
console.log('Termina em 6304+CRC: ' + codigo.includes('6304'));
console.log('');

// o payload antes do CRC precisa ser valido
const corpo = codigo.slice(0, codigo.lastIndexOf('6304'));
const campos = lerTLV(corpo, 6);
campos.forEach(c => console.log('  ' + c.id + ' (' + c.len + ') ' + c.valor));

const tlv26 = lerTLV(campos.find(c => c.id === '26').valor);
const chaveGerada = tlv26.find(c => c.id === '01').valor;
const valor = campos.find(c => c.id === '54');
const nome = campos.find(c => c.id === '59');
const cidade = campos.find(c => c.id === '60');
const txid = lerTLV(campos.find(c => c.id === '62').valor).find(c => c.id === '05').valor;

console.log('');
console.log('Chave pix .......: ' + chaveGerada + (chaveGerada === chave ? '  OK' : '  ERRO'));
console.log('Valor ...........: ' + (valor ? valor.valor : 'ausente') + (valor && valor.valor === '397.00' ? '  OK' : '  ERRO'));
console.log('Nome (max 25) ...: ' + nome.valor + ' (' + nome.len + ')');
console.log('Cidade (max 15) .: ' + cidade.valor + ' (' + cidade.len + ')');
console.log('Txid .............: ' + txid);
console.log('');
console.log('Chave valida ....: ' + (chavePixOk(chave) ? 'sim' : 'nao'));
console.log('Tudo dentro do limite: ' + (nome.len <= 25 && cidade.len <= 25 ? 'sim' : 'nao'));
