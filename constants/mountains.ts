export interface MountainInfo {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  zone: "A_CLOUD_TRAP" | "B_WIND_TUNNEL";
  aliases?: string[];
}

export const MOUNTAIN_DB: Record<string, MountainInfo> = {
  // --- SƠN LA ---
  TA_XUA_SON_LA: {
    name: "Tà Xùa (Sống lưng Khủng Long)",
    lat: 21.2655, lon: 104.2800, elevation: 1600,
    zone: "A_CLOUD_TRAP",
    aliases: ['ta xua', 'khung long', 'song lung', 'bac yen', 'thiên đường mây', 'tà xùa', 'bắc yên', 'sống lưng khủng long', 'ta xua son la']
  },
  PHA_LUONG: {
    name: "Đỉnh Pha Luông",
    lat: 20.6861, lon: 104.6056, elevation: 2000,
    zone: "A_CLOUD_TRAP",
    aliases: ['pha luong', 'moc chau', 'đỉnh pha luông', 'nóc nhà mộc châu', 'mộc châu', 'cửa khẩu lóng sập']
  },
  HANG_KIA_PA_CO: {
    name: "Hang Kia - Pà Cò",
    lat: 20.7410, lon: 104.9310, elevation: 1200,
    zone: "A_CLOUD_TRAP",
    aliases: ['hang kia', 'pa co', 'pa cò', 'mai chau', 'mai châu', 'hòa bình']
  },
  XIM_VANG: {
    name: "Xím Vàng",
    lat: 21.3250, lon: 104.2510, elevation: 1500,
    zone: "A_CLOUD_TRAP",
    aliases: ['xim vang', 'ruong bac thang', 'xím vàng', 'bắc yên']
  },
  PU_NHI_FARM: {
    name: "Pu Nhi Farm",
    lat: 21.1730, lon: 104.3160, elevation: 700,
    zone: "A_CLOUD_TRAP",
    aliases: ['pu nhi', 'pu nhi farm', 'bắc yên', 'đồi pu nhi']
  },
  DINH_U_BO: {
    name: "Đỉnh U Bò",
    lat: 21.2380, lon: 104.3410, elevation: 1500,
    zone: "A_CLOUD_TRAP",
    aliases: ['u bò', 'đỉnh u bò', 'bắc yên', 'tà xùa']
  },

  // --- LÀO CAI ---
  FANSIPAN: {
    name: "Fansipan (Nóc nhà Đông Dương)",
    lat: 22.3033, lon: 103.7750, elevation: 3143,
    zone: "B_WIND_TUNNEL",
    aliases: ['fansipan', 'phan xi pang', 'phanxipang', 'hoang lien son', 'nóc nhà đông dương', 'sapa', 'phan']
  },
  LAO_THAN: {
    name: "Lảo Thẩn (Y Tý)",
    lat: 22.6105, lon: 103.6258, elevation: 2860,
    zone: "A_CLOUD_TRAP",
    aliases: ['lao than', 'y ty', 'hau thao', 'lảo thẩn', 'mây y tý', 'đỉnh nhọn', 'y tý']
  },
  KY_QUAN_SAN: {
    name: "Ky Quan San (Bạch Mộc Lương Tử)",
    lat: 22.5050, lon: 103.5850, elevation: 3046,
    zone: "A_CLOUD_TRAP",
    aliases: ['ky quan san', 'bach moc luong tu', 'bach moc', 'sang ma sao', 'bạch mộc', 'muối', 'kqs', 'bach moc lao cai']
  },
  NHIU_CO_SAN: {
    name: "Nhìu Cồ San (Sừng Trâu)",
    lat: 22.5833, lon: 103.5167, elevation: 2965,
    zone: "A_CLOUD_TRAP",
    aliases: ['nhiu co san', 'sung trau', 'trinh tuong', 'nhìu cồ san', 'nhiu cồ san']
  },
  NGU_CHI_SON: {
    name: "Ngũ Chỉ Sơn",
    lat: 22.4286, lon: 103.7125, elevation: 2858,
    zone: "B_WIND_TUNNEL",
    aliases: ['ngu chi son', 'ban tay phat', 'ngũ chỉ sơn', 'tả giàng phình']
  },
  SAPA_HAM_RONG: {
    name: "Thị trấn Sapa (Hàm Rồng)",
    lat: 22.3364, lon: 103.8438, elevation: 1600,
    zone: "A_CLOUD_TRAP",
    aliases: ['sapa', 'sa pa', 'ham rong', 'hàm rồng', 'sân mây', 'thị trấn mờ sương']
  },
  NGAI_THAU_THUONG: {
    name: "Ngải Thầu Thượng (Y Tý)",
    lat: 22.6780, lon: 103.6010, elevation: 2100,
    zone: "A_CLOUD_TRAP",
    aliases: ['ngải thầu', 'ngải thầu thượng', 'y tý', 'bát xát', 'ngai thau']
  },
  CU_NHU_SAN: {
    name: "Đỉnh Cú Nhù San",
    lat: 22.5450, lon: 103.5350, elevation: 2662,
    zone: "A_CLOUD_TRAP",
    aliases: ['cú nhù san', 'cu nhu san', 'y tý']
  },
  NAM_KANG_HO_TAO: {
    name: "Nam Kang Ho Tao",
    lat: 22.1814, lon: 103.8822, elevation: 2881,
    zone: "B_WIND_TUNNEL",
    aliases: ['nam kang ho tao', 'nam kang', 'nậm cang']
  },
  BAN_HANG_DA: {
    name: "Bản Hang Đá (Sapa)",
    lat: 22.3110, lon: 103.8780, elevation: 1800,
    zone: "A_CLOUD_TRAP",
    aliases: ['hang đá', 'bản hang đá', 'sapa', 'hầu thào']
  },

  // --- YÊN BÁI ---
  TA_XUA_YEN_BAI: {
    name: "Tà Xùa (Phu Sa Phìn - Yên Bái)",
    lat: 21.5300, lon: 104.3200, elevation: 2865,
    zone: "A_CLOUD_TRAP",
    aliases: ['ta xua trek', 'tram tau', 'phu sa phin', 'trạm tấu', 'tà xùa yên bái', 'ta xua yen bai']
  },
  TA_CHI_NHU: {
    name: "Tà Chì Nhù (Đồi hoa tím)",
    lat: 21.5639, lon: 104.3000, elevation: 2979,
    zone: "A_CLOUD_TRAP",
    aliases: ['ta chi nhu', 'phu song sung', 'doi hoa tim', 'chung chua nha', 'tà chì nhù', 'chi pâu']
  },
  LUNG_CUNG: {
    name: "Lùng Cúng",
    lat: 21.8906, lon: 104.2694, elevation: 2913,
    zone: "A_CLOUD_TRAP",
    aliases: ['lung cung', 'mu cang chai', 'lùng cúng', 'mù cang chải', 'tu san']
  },
  DEO_KHAU_PHA: {
    name: "Đèo Khau Phạ",
    lat: 21.7580, lon: 104.2750, elevation: 1200,
    zone: "A_CLOUD_TRAP",
    aliases: ['khau phạ', 'đèo khau phạ', 'mù cang chải', 'khau pha']
  },
  DOI_MAM_XOI: {
    name: "Đồi Mâm Xôi (Mù Cang Chải)",
    lat: 21.8410, lon: 104.1480, elevation: 1000,
    zone: "A_CLOUD_TRAP",
    aliases: ['mâm xôi', 'la pán tẩn', 'mù cang chải', 'mam xoi']
  },

  // --- LAI CHÂU ---
  PUTALENG: {
    name: "Putaleng",
    lat: 22.4250, lon: 103.6250, elevation: 3049,
    zone: "B_WIND_TUNNEL",
    aliases: ['putaleng', 'pu ta leng', 'tả lèng', 'tam đường']
  },
  PUSILUNG: {
    name: "Pusilung (Biên giới)",
    lat: 22.6280, lon: 102.7840, elevation: 3083,
    zone: "B_WIND_TUNNEL",
    aliases: ['pusilung', 'moc 42', 'pa ve su', 'biên giới', 'pu si lung']
  },
  TA_LIEN_SON: {
    name: "Tả Liên Sơn (Cổ Trâu)",
    lat: 22.4550, lon: 103.5500, elevation: 2996,
    zone: "B_WIND_TUNNEL",
    aliases: ['ta lien son', 'co trau', 'ta leng', 'tả liên', 'tả liên sơn']
  },
  DEO_O_QUY_HO: {
    name: "Đèo Ô Quy Hồ",
    lat: 22.3550, lon: 103.7740, elevation: 2035,
    zone: "B_WIND_TUNNEL",
    aliases: ['o quy ho', 'cong troi', 'deo o quy ho', 'ô quy hồ', 'cổng trời', 'o quy ho pass']
  },
  SI_THAU_CHAI: {
    name: "Sì Thâu Chải",
    lat: 22.3210, lon: 103.6330, elevation: 1400,
    zone: "B_WIND_TUNNEL",
    aliases: ['sì thâu chải', 'tam đường', 'si thau chai']
  },

  // --- ĐIỆN BIÊN ---
  DEO_PHA_DIN: {
    name: "Đèo Pha Đin",
    lat: 21.5720, lon: 103.5230, elevation: 1048,
    zone: "A_CLOUD_TRAP",
    aliases: ['pha đin', 'đèo pha đin', 'pha din']
  },
  CUC_TAY_A_PA_CHAI: {
    name: "Cực Tây A Pa Chải",
    lat: 22.4010, lon: 102.1430, elevation: 1864,
    zone: "A_CLOUD_TRAP",
    aliases: ['a pa chải', 'cực tây', 'mường nhé', 'a pa chai']
  },

  // --- HÒA BÌNH ---
  LUNG_VAN: {
    name: "Lũng Vân (Nóc nhà xứ Mường)",
    lat: 20.6120, lon: 105.1830, elevation: 1200,
    zone: "A_CLOUD_TRAP",
    aliases: ['lũng vân', 'tân lạc', 'lung van', 'nóc nhà xứ mường']
  },
  DEO_THUNG_KHE: {
    name: "Đèo Thung Khe (Đèo Đá Trắng)",
    lat: 20.7290, lon: 105.1320, elevation: 1000,
    zone: "A_CLOUD_TRAP",
    aliases: ['thung khe', 'đèo đá trắng', 'mai châu', 'thung khe pass']
  }
};
