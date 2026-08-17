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
    name: "Hang Kia - Pà Cò (Thung Mài)",
    lat: 20.7410, lon: 104.9310, elevation: 1200,
    zone: "A_CLOUD_TRAP",
    aliases: ['hang kia', 'pa co', 'pa cò', 'mai chau', 'mai châu', 'hòa bình', 'thung mài', 'thung mai', 'săn mây thung mài']
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
  },

  // --- HÀ GIANG ---
  DEO_MA_PI_LENG: {
    name: "Đèo Mã Pí Lèng (Mèo Vạc)",
    lat: 23.2389, lon: 105.3283, elevation: 1400,
    zone: "A_CLOUD_TRAP",
    aliases: ['mã pí lèng', 'ma pi leng', 'mèo vạc', 'mã pì lèng', 'sông nho quế']
  },
  CHIEU_LAU_THI: {
    name: "Đỉnh Chiêu Lầu Thi",
    lat: 22.6658, lon: 104.6644, elevation: 2402,
    zone: "A_CLOUD_TRAP",
    aliases: ['chiêu lầu thi', 'chieu lau thi', 'hoàng su phì', 'hoang su phi']
  },
  TAY_CON_LINH: {
    name: "Tây Côn Lĩnh",
    lat: 22.8050, lon: 104.8140, elevation: 2427,
    zone: "B_WIND_TUNNEL",
    aliases: ['tây côn lĩnh', 'tay con linh', 'nóc nhà hà giang']
  },
  DONG_VAN: {
    name: "Cao nguyên đá Đồng Văn",
    lat: 23.2786, lon: 105.3619, elevation: 1500,
    zone: "A_CLOUD_TRAP",
    aliases: ['đồng văn', 'dong van', 'mèo vạc', 'cao nguyên đá']
  },

  // --- THANH HÓA ---
  PU_LUONG: {
    name: "Pù Luông",
    lat: 20.4439, lon: 105.1583, elevation: 1700,
    zone: "A_CLOUD_TRAP",
    aliases: ['pù luông', 'pu luong', 'bá thước', 'đỉnh pù luông']
  },

  // --- VĨNH PHÚC & HÀ NỘI ---
  TAM_DAO: {
    name: "Tam Đảo",
    lat: 21.4583, lon: 105.6458, elevation: 1200,
    zone: "A_CLOUD_TRAP",
    aliases: ['tam đảo', 'tam dao', 'thị trấn tam đảo']
  },
  BA_VI: {
    name: "Đỉnh Ba Vì (Đỉnh Vua)",
    lat: 21.0800, lon: 105.3600, elevation: 1280,
    zone: "A_CLOUD_TRAP",
    aliases: ['ba vì', 'ba vi', 'đỉnh vua', 'núi ba vì', 'cốt 1100', 'cot 1100', 'vườn quốc gia ba vì']
  },
  MAU_SON: {
    name: "Mẫu Sơn (Lạng Sơn)",
    lat: 21.8419, lon: 106.9208, elevation: 1500,
    zone: "A_CLOUD_TRAP",
    aliases: ['mẫu sơn', 'mau son', 'lạng sơn', 'núi cha', 'phja pò', 'phặt chỉ', 'sống lưng khủng long mẫu sơn']
  },

  // --- BỔ SUNG 8/2026: các điểm hot 2025-2026, tọa độ xác minh qua OSM/Nominatim + DEM ---
  SA_MU_U_BO: {
    name: "Sa Mu - U Bò (2756m)",
    lat: 21.3491, lon: 104.4127, elevation: 2756, // đường mòn Sa Mu (OSM), đỉnh 2756m KBT Tà Xùa
    zone: "A_CLOUD_TRAP",
    aliases: ['sa mu', 'samu', 'sa mu u bò', 'u bò 2756', 'háng đồng', 'khu bảo tồn tà xùa', 'sa mu u bo']
  },
  BINH_LIEU: {
    name: "Bình Liêu - Cao Xiêm (Sống lưng khủng long)",
    lat: 21.5203, lon: 107.4883, elevation: 1429, // núi Cao Xiêm (OSM), DEM 1414m
    zone: "B_WIND_TUNNEL", // đồi trọc biên giới đón thẳng gió mùa Đông Bắc
    aliases: ['bình liêu', 'binh lieu', 'cao xiêm', 'mốc 1305', 'cột mốc 1305', 'sống lưng khủng long bình liêu', 'quảng ninh', 'cỏ lau']
  },
  PHIA_OAC: {
    name: "Phia Oắc (Cao Bằng)",
    lat: 22.6153, lon: 105.8636, elevation: 1931, // OSM "Núi Phja Oắc", DEM 1917m
    zone: "A_CLOUD_TRAP",
    aliases: ['phia oắc', 'phja oắc', 'phia oac', 'phia đén', 'nguyên bình', 'cao bằng', 'băng giá']
  },
  BACH_MA: {
    name: "Bạch Mã (Vọng Hải Đài)",
    lat: 16.1750, lon: 107.8381, elevation: 1448, // OSM "Núi Bạch Mã", DEM 1338m
    zone: "B_WIND_TUNNEL", // núi ven biển đón gió Đông, mù kéo rất nhanh
    aliases: ['bạch mã', 'bach ma', 'vọng hải đài', 'huế', 'vườn quốc gia bạch mã']
  },
  BA_DEN: {
    name: "Núi Bà Đen (Tây Ninh)",
    lat: 11.3824, lon: 106.1702, elevation: 986, // OSM, DEM 967m
    zone: "A_CLOUD_TRAP", // núi đơn độc giữa đồng bằng — mây bức xạ/mây đĩa khi lặng gió
    aliases: ['bà đen', 'ba den', 'tây ninh', 'đĩa mây', 'nóc nhà nam bộ', 'núi bà']
  },
  MANG_DEN: {
    name: "Măng Đen",
    lat: 14.5772, lon: 108.2775, elevation: 1200, // OSM trung tâm Măng Đen, DEM 1151m
    zone: "A_CLOUD_TRAP",
    aliases: ['măng đen', 'mang den', 'kon plông', 'kon tum', 'đồi đức mẹ', 'đà lạt thứ hai']
  },
  CAU_DAT: {
    name: "Đồi chè Cầu Đất (Đà Lạt)",
    lat: 11.8829, lon: 108.5519, elevation: 1500, // OSM Cầu Đất - Xuân Trường, DEM 1479m
    zone: "A_CLOUD_TRAP",
    aliases: ['cầu đất', 'cau dat', 'đồi chè cầu đất', 'xuân trường', 'săn mây đà lạt', 'cầu đất farm']
  },
  LANG_BIANG: {
    name: "Núi Lang Biang",
    lat: 12.0473, lon: 108.4406, elevation: 2167, // OSM "Núi Lang Biang", DEM 2113m
    zone: "A_CLOUD_TRAP",
    aliases: ['lang biang', 'langbiang', 'lạc dương', 'đà lạt', 'radar lang biang']
  },
  LINH_QUY_PHAP_AN: {
    name: "Linh Quy Pháp Ấn (Bảo Lộc)",
    lat: 11.4350, lon: 107.8159, elevation: 850, // OSM, DEM 840m
    zone: "A_CLOUD_TRAP",
    aliases: ['linh quy pháp ấn', 'linh quy phap an', 'cổng trời bảo lộc', 'bảo lộc', 'chùa săn mây']
  },
  TA_NANG: {
    name: "Tà Năng - Phan Dũng",
    lat: 11.5942, lon: 108.4906, elevation: 1100, // OSM xã Tà Năng, DEM 1032m
    zone: "A_CLOUD_TRAP",
    aliases: ['tà năng', 'ta nang', 'phan dũng', 'tà năng phan dũng', 'đồi cỏ', 'đức trọng']
  },

  // --- BỔ SUNG 8/2026 (đợt 2): điểm ÍT NGƯỜI BIẾT do user cung cấp, đã xác minh tọa độ ---
  PHINH_HO: {
    name: "Phình Hồ (Trạm Tấu)",
    lat: 21.5221, lon: 104.5418, elevation: 1080, // OSM đường Phình Hồ, DEM 1083m; thung lũng dưới 319m
    zone: "A_CLOUD_TRAP",
    aliases: ['phình hồ', 'phinh ho', 'trạm tấu', 'săn mây phình hồ', 'đồi chè phình hồ']
  },
  LANG_NHI: {
    name: "Làng Nhì (Trạm Tấu)",
    lat: 21.4952, lon: 104.5394, elevation: 950, // OSM đường Làng Nhì, DEM 945m; đỉnh cục bộ ~1641m
    zone: "A_CLOUD_TRAP",
    aliases: ['làng nhì', 'lang nhi', 'đỉnh săn mây làng nhì', 'săn mây làng nhì']
  },
  TA_LENG_SAN_MAY: {
    name: "Đồi săn mây Tả Lèng (Lai Châu)",
    lat: 22.43069, lon: 103.50131, elevation: 1360, // plus code CGJ2+7G user cung cấp, DEM 1363m
    zone: "B_WIND_TUNNEL",
    aliases: ['săn mây tả lèng', 'săn mây lai châu', 'đồi săn mây tả lèng', 'tả lèng lai châu', 'san may lai chau']
  },
  NGOC_SON_LAC_SON: {
    name: "Điểm săn mây Ngọc Sơn (Lạc Sơn)",
    lat: 20.44256, lon: 105.38106, elevation: 390, // plus code C9VJ+2C user cung cấp, DEM 391m; thung lũng dưới 47m
    zone: "A_CLOUD_TRAP",
    aliases: ['ngọc sơn', 'ngoc son', 'lạc sơn', 'săn mây ngọc sơn', 'ngổ luông']
  },
  KEO_LOM: {
    name: "Kéo Lồm - Phiêng Pằn (Mai Sơn)",
    lat: 21.0542, lon: 104.0422, elevation: 860, // tọa độ trung tâm xã Phiêng Pằn (OSM), DEM 855m; đỉnh cục bộ ~1147m
    zone: "A_CLOUD_TRAP",
    aliases: ['kéo lồm', 'keo lom', 'phiêng pằn', 'phieng pan', 'mai sơn', 'săn mây kéo lồm']
  },
  DON_DEN: {
    name: "Đồn Đèn (Ba Bể)",
    lat: 22.42481, lon: 105.67906, elevation: 660, // plus code CMFH+WJ user cung cấp, DEM 659m; thung lũng Ba Bể dưới 172m
    zone: "A_CLOUD_TRAP",
    aliases: ['đồn đèn', 'don den', 'ba bể', 'ba be', 'săn mây đồn đèn', 'bắc kạn', 'khang ninh']
  },
  BAN_NA: {
    name: "Điểm săn mây Bản Nà (Tân Yên)",
    lat: 21.00219, lon: 104.55731, elevation: 740, // plus code 2H24+VWM user cung cấp (hiệu chỉnh ô OLC), DEM 737m
    zone: "A_CLOUD_TRAP",
    aliases: ['bản nà', 'ban na', 'tân yên', 'săn mây bản nà']
  },
  CHIENG_CONG: {
    name: "Điểm săn mây Chiềng Công (Mường La)",
    lat: 21.43931, lon: 104.19894, elevation: 1350, // plus code C5QX+PH6 user cung cấp, DEM 1354m; đáy thung lũng 464m
    zone: "A_CLOUD_TRAP",
    aliases: ['chiềng công', 'chieng cong', 'chiềng hoa', 'mường la', 'săn mây chiềng công']
  }
};
