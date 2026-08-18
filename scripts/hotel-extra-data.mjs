// 酒店星级/Booking 评分补充表（web 调研，2026-08-18）——供 build-hotel-prices.js 合并。
// xlsx 里星级/评分列有值时优先用 xlsx 的；此处只在 xlsx 为空时兜底。
// 结构：{ "MIL": { "HOLIDAY INN NORD ZARA": { star: 4, rating: 8.3 }, ... } }
// 用法：npm run build:hotels 自动合并，无需手工改动 hotel-prices.json。
//
// 调研说明（12/13 组，2026-08-18）：
// - 评分优先 Booking.com 官方页（部分被 WAF 拦时用 Priceline——Booking Holdings 同源数据，
//   Trivago 聚合分（以 Booking 评论为主）、Trip.com 交叉验证，差值 ≤0.5）
// - 星级来自 Booking 页面标题 / 酒店官网 / Trivago schema / Trip.com
// - 后续调研规则（用户口径 2026-08-18）：**主要查 Booking.com 的价格/评分**；
//   Priceline/Trivago/Trip.com 仅作 Booking 实在查不到时的备选
export default {
  MIL: {
    'HOLIDAY INN NORD ZARA': { star: 4, rating: 8.2 },
    'CROWNE PLAZA LINATE': { star: 4, rating: 7.8 },
    'BELSTAY ASSAGO': { star: 4, rating: 8.1 },
  },
  VCE: {
    'NOVOTEL MESTRE CASTELLANA': { star: 4, rating: 8.0 },
    'BELSTAY MESTRE': { star: 4, rating: 8.3 },
  },
  FLR: {
    'ART MUSEO': { star: 4, rating: 8.6 }, // 实际位于普拉托 Prato（Booking 唯一同名）
    'DATINI': { star: 4, rating: 8.6 }, // 实际位于普拉托 Prato
  },
  ROM: {
    'THE CAESAR': { star: 4, rating: 7.9 },
    'PRECISE HOUSE MANTEGNA ROMA': { star: 4, rating: 9.3 },
    'WARMTHOTEL': { star: 4, rating: 8.9 },
  },
  PAR: {
    'MERCURE LA DEFENSE': { star: 4, rating: 7.5 },
    'PULLMAN LA DEFENSE': { star: 5, rating: 7.7 },
    'MERCURE VAL DE FONTENAY': { star: 4, rating: 8.5 },
  },
  ZRH: {
    'HOLIDAY INN MESSE': { star: 4, rating: 8.1 },
  },
  GRW: {
    'SUNSTAR GRINDELWALD': { star: 4, rating: 8.6 },
  },
  GVA: {
    'MOEVENPICK-GENEVE': { star: 4, rating: 8.4 }, // trivago 聚合（Booking 主源）
  },
  DIJ: {
    'NOVOTEL DIJON SUD': { star: 4, rating: 7.2 }, // trivago 聚合
  },
  INN: {
    'GRAUER BAER': { star: 4, rating: 8.6 }, // trivago 聚合
  },
  LNZ: {
    'HARRYS HOME LNZ': { star: 4, rating: 8.6 }, // trivago 聚合
  },
  PRG: {
    'URBAN CREME': { star: 5, rating: 8.6 }, // trivago 聚合
  },
  WRO: {
    'ALTUS PALACE': { star: 5, rating: 9.3 }, // Priceline/Trip.com
  },
  WAW: {
    'LEONARDO ROYAL': { star: 4, rating: 8.3 },
  },
  KRK: {
    'UNICUS PALACE': { star: 5, rating: 9.1 },
  },
  BRQ: {
    'PALACE BRNO': { star: 5, rating: 9.2 }, // = Barceló Brno Palace
  },
  VIE: {
    'SENATOR R': { star: 4, rating: 8.2 },
  },
  BUD: {
    'RADISSON BLU BEKE': { star: 4, rating: 8.9 },
  },
  FRA: {
    'DIWOTEL BY TRIP INN': { star: 4, rating: 8.0 },
  },
  BFT: {
    'MERCURE BELFORT CENTRE': { star: 4, rating: 8.4 },
  },
  LUZ: {
    'AVA': { star: 4, rating: 8.4 },
  },
  BLQ: {
    'NH BOLOGNA VILLANOVA': { star: 4, rating: 8.5 },
  },
  PMF: {
    'SAN MARCO / PARMA E CONGRESSI BED BANK': { star: 4, rating: 7.6 }, // Hotel San Marco & Formula Club, Noceto
  },
  STO: {
    'BW TEN': { star: 4, rating: 8.6 },
  },
  TLL: {
    'EUROPA': { star: 4, rating: 8.6 },
  },
  RIX: {
    'BELLEVUE': { star: 4, rating: 8.7 },
  },
  VNO: {
    'RADISSON LIETUVA': { star: 4, rating: 9.0 },
  },
  KSD: {
    'SCANDIC WINN': { star: 4, rating: 8.1 },
  },
  OSL: {
    'X HOTEL': { star: 4, rating: 8.2 }, // = Moxy Oslo X, Skjetten
  },
  VOS: {
    'SCANDIC VOSS': { star: 4, rating: 8.2 },
  },
  GOT: {
    'SCANDIC BACKADAL / MOLNDAL - BEDBANK': { star: 4, rating: 7.3 },
  },
  CPH: {
    'SCANDIC HVIDOVRE/GLOSTRUP - BEDBANK': { star: 4, rating: 7.6 },
  },
  MUC: {
    'MERCURE NEUPERLACH SUED': { star: 4, rating: 8.1 }, // Trip.com（Booking 被拦）
    'FERINGAPARK': { star: 4, rating: 8.1 }, // Trip.com
  },
  SZG: {
    'RADISSON BLU SZG': { star: 4, rating: 8.6 }, // = Radisson Blu Hotel & Conference Centre Salzburg（非 Altstadt）
  },
  FES: {
    'BW PLUS FUESSEN': { star: 4, rating: 9.0 }, // Trip.com
  },
  AGB: {
    'AN DER KONGRESSHALLE AUGSBURG': { star: 4, rating: 8.6 }, // Trip.com
  },
  NUE: {
    'MOEVENPICK NUERNBERG': { star: 4, rating: 8.5 },
  },
  RTB: {
    'PRINZHOTEL': { star: 4, rating: 8.2 },
  },
  HDB: {
    'LEONARDO HEIDELBERG': { star: 4, rating: 8.1 },
  },
  CGN: {
    'MERCURE WEST': { star: 4, rating: 8.1 }, // 4-star-superior
  },
  HAM: {
    'PRIZE BY RADISSON HAMBURG CITY': { star: 3, rating: 7.9 },
  },
  BER: {
    'PARK INN ALEXANDERPLATZ': { star: 4, rating: 8.1 },
  },
  DRS: {
    'STEIGENBERGER DE SAXE': { star: 5, rating: 8.9 },
  },
  AMS: {
    'NOVOTEL SCHIPHOL AIRPORT': { star: 4, rating: 8.3 },
  },
  RVN: {
    'SANTAS IGLOOS ARCTIC CIRCLE': { star: 5, rating: 8.9 },
    'SANTA CLAUS': { star: 4, rating: 8.9 }, // Santa Claus Holiday Village（圣诞老人村，与 Igloos 同园区）
  },
  SRS: {
    'RIEKONLINNA': { star: 4, rating: 8.0 },
  },
  KKN: {
    'THON KIRKENES': { star: 4, rating: 8.7 },
  },
  LEV: {
    'SOKOS LEVI': { star: 4, rating: 8.9 },
  },
  KEM: {
    'SCANDIC KEMI': { star: 4, rating: 7.6 },
  },
  HEL: {
    'HILTON HELSINKI STRAND': { star: 5, rating: 8.3 },
  },
  LON: {
    'HOLIDAY INN EXPRESS HEATHROW T4': { star: 4, rating: 8.7 }, // Booking 标题 ★★★★；Trivago 8.7/29214 条
  },
  LBA: {
    'RAMADA WAKEFIELD': { star: 4, rating: 7.5 }, // Booking 标题 ★★★★（Trivago/KAYAK 3星系 Expedia 分类，按 Booking 取4）
  },
  GLA: {
    'HOLIDAY INN EAST KILBRIDE': { star: 4, rating: 7.9 },
  },
  SXT: {
    'COURTYARD BY MARRIOTT KEELE-STAFFORDSHIRE': { star: 4, rating: 8.8 },
  },
  SWI: {
    'HOLIDAY INN SWINDON': { star: 3, rating: 7.9 },
  },
}
