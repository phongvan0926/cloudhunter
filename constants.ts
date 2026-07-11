import { PeakPreset } from './types';

export const NORTHWEST_PEAKS: PeakPreset[] = [
  // --- SƠN LA ---
  { 
    name: 'Tà Xùa (Sống lưng Khủng Long)', 
    altitude: 2865, 
    province: 'Sơn La',
    aliases: ['ta xua', 'khung long', 'song lung', 'bac yen', 'thiên đường mây', 'tà xùa', 'bắc yên', 'sống lưng khủng long', 'ta xua son la'],
    elevation_profile: [
      { label: 'TT. Bắc Yên', altitude: 700, type: 'VALLEY', description: 'Trung tâm huyện, điểm tập kết ăn uống' },
      { label: 'Đèo Chống Gậy', altitude: 1300, type: 'SLOPE', description: 'Cung đường đèo dốc quanh co sương mù' },
      { label: 'Thung lũng Mây', altitude: 1200, type: 'VALLEY', description: 'Khu vực lòng chảo, mây thường đọng lại' },
      { label: 'Sống lưng KL', altitude: 1600, type: 'RIDGE', description: 'Sống núi hẹp 2 bên là vực, điểm săn mây chính' },
      { label: 'Đỉnh Tà Xùa', altitude: 2865, type: 'PEAK', description: 'Đỉnh cao nhất của dãy Tà Xùa, đường trekking rừng rêu' }
    ]
  },
  { 
    name: 'Đỉnh Pha Luông', 
    altitude: 2000, 
    province: 'Sơn La',
    aliases: ['pha luong', 'moc chau', 'đỉnh pha luông', 'nóc nhà mộc châu', 'mộc châu', 'cửa khẩu lóng sập'],
    elevation_profile: [
      { label: 'Đồn Biên Phòng', altitude: 1400, type: 'VALLEY', description: 'Điểm xuất phát trekking, làm thủ tục biên giới' },
      { label: 'Rừng Trúc', altitude: 1600, type: 'SLOPE', description: 'Rừng trúc xanh mát đẹp như phim kiếm hiệp' },
      { label: 'Vách Đá', altitude: 1900, type: 'RIDGE', description: 'Vách đá sống ảo dựng đứng, view Lào' },
      { label: 'Đỉnh Pha Luông', altitude: 2000, type: 'PEAK', description: 'Bàn đá phẳng rộng trên đỉnh, gió mạnh' }
    ]
  },
  { 
    name: 'Hang Kia - Pà Cò', 
    altitude: 1200, 
    province: 'Sơn La',
    aliases: ['hang kia', 'pa co', 'pa cò', 'mai chau', 'mai châu', 'hòa bình'],
    elevation_profile: [
      { label: 'QL6', altitude: 800, type: 'VALLEY', description: 'Đường quốc lộ huyết mạch' },
      { label: 'Dốc Cun', altitude: 1000, type: 'SLOPE', description: 'Dốc đá trắng hiểm trở, sương mù dày' },
      { label: 'Thung lũng Kia', altitude: 1100, type: 'VALLEY', description: 'Thung lũng trồng mận, đào' },
      { label: 'Cổng Trời', altitude: 1200, type: 'PEAK', description: 'Điểm săn mây view toàn cảnh thung lũng' }
    ]
  },
  { 
    name: 'Xím Vàng', 
    altitude: 1500, 
    province: 'Sơn La',
    aliases: ['xim vang', 'ruong bac thang', 'xím vàng', 'bắc yên'],
    elevation_profile: [
      { label: 'Ngã 3 Tà Xùa', altitude: 1500, type: 'RIDGE', description: 'Nút giao thông chính trên cao' },
      { label: 'Sườn Xím Vàng', altitude: 1300, type: 'SLOPE', description: 'Ruộng bậc thang trải dài theo sườn núi' },
      { label: 'Suối Xím', altitude: 1000, type: 'VALLEY', description: 'Suối nước chảy mạnh, thác nước' },
      { label: 'Đồi Chè', altitude: 1400, type: 'SLOPE', description: 'Khu vực trồng chè cổ thụ san tuyết' }
    ]
  },
  { 
    name: 'Pu Nhi Farm', 
    altitude: 700, 
    province: 'Sơn La',
    aliases: ['pu nhi', 'pu nhi farm', 'bắc yên', 'đồi pu nhi'],
    elevation_profile: [
      { label: 'TT. Bắc Yên', altitude: 300, type: 'VALLEY', description: 'Trung tâm huyện' },
      { label: 'Đồi Pu Nhi', altitude: 700, type: 'PEAK', description: 'Đồi cỏ rộng, view thung lũng mây' }
    ]
  },
  { 
    name: 'Đỉnh U Bò', 
    altitude: 1500, 
    province: 'Sơn La',
    aliases: ['u bò', 'đỉnh u bò', 'bắc yên', 'tà xùa'],
    elevation_profile: [
      { label: 'Ngã 3 Tà Xùa', altitude: 1500, type: 'RIDGE', description: 'Nút giao thông chính trên cao' },
      { label: 'Đỉnh U Bò', altitude: 1500, type: 'PEAK', description: 'Điểm ngắm hoàng hôn và biển mây' }
    ]
  },

  // --- LÀO CAI ---
  { 
    name: 'Fansipan (Nóc nhà Đông Dương)', 
    altitude: 3143, 
    province: 'Lào Cai',
    aliases: ['fansipan', 'phan xi pang', 'phanxipang', 'hoang lien son', 'nóc nhà đông dương', 'sapa', 'phan'],
    elevation_profile: [
      { label: 'Trạm Tôn', altitude: 1900, type: 'VALLEY', description: 'Cửa rừng VQG Hoàng Liên, đèo Ô Quy Hồ' },
      { label: 'Lán 2200m', altitude: 2200, type: 'SLOPE', description: 'Điểm nghỉ chân đầu tiên, rừng già' },
      { label: 'Lán 2800m', altitude: 2800, type: 'RIDGE', description: 'Trạm nghỉ đêm kín gió, gần đỉnh' },
      { label: 'Đỉnh Fansipan', altitude: 3143, type: 'PEAK', description: 'Chóp kim loại 3143m, quần thể chùa' }
    ]
  },
  { 
    name: 'Lảo Thẩn (Y Tý)', 
    altitude: 2860, 
    province: 'Lào Cai',
    aliases: ['lao than', 'y ty', 'hau thao', 'lảo thẩn', 'mây y tý', 'đỉnh nhọn', 'y tý'],
    elevation_profile: [
      { label: 'Chân núi', altitude: 1800, type: 'VALLEY', description: 'Trang trại rau Phìn Hồ, đường đất đỏ' },
      { label: 'Đồi cỏ cháy', altitude: 2200, type: 'SLOPE', description: 'Đồi cỏ vàng rực nắng, cây khô cô đơn' },
      { label: 'Lán A Hờ', altitude: 2560, type: 'RIDGE', description: 'Hang đá & Lán nghỉ view biển mây trực diện' },
      { label: 'Đỉnh Lảo Thẩn', altitude: 2860, type: 'PEAK', description: 'Chóp inox, view Hoàng Liên Sơn' }
    ]
  },
  { 
    name: 'Ky Quan San (Bạch Mộc Lương Tử)', 
    altitude: 3046, 
    province: 'Lào Cai',
    aliases: ['ky quan san', 'bach moc luong tu', 'bach moc', 'sang ma sao', 'bạch mộc', 'muối', 'kqs', 'bach moc lao cai'],
    elevation_profile: [
      { label: 'Sàng Ma Sáo', altitude: 900, type: 'VALLEY', description: 'Bản người Mông chân núi, ruộng bậc thang' },
      { label: 'Núi Muối', altitude: 2100, type: 'RIDGE', description: 'Điểm ngắm bình minh/biển mây đẹp nhất hành trình' },
      { label: 'Sống lưng', altitude: 2800, type: 'RIDGE', description: 'Sống lưng khủng long hiểm trở, gió tạt mạnh' },
      { label: 'Đỉnh KQS', altitude: 3046, type: 'PEAK', description: 'Đỉnh cao thứ 4 VN, view 360 độ' }
    ]
  },
  { 
    name: 'Nhìu Cồ San (Sừng Trâu)', 
    altitude: 2965, 
    province: 'Lào Cai',
    aliases: ['nhiu co san', 'sung trau', 'trinh tuong', 'nhìu cồ san', 'nhiu cồ san'],
    elevation_profile: [
      { label: 'Bản Nhìu Cồ San', altitude: 1000, type: 'VALLEY', description: 'Bản có đường đá cổ Pavi, mùa hoa đào' },
      { label: 'Thác Ong Chúa', altitude: 1600, type: 'SLOPE', description: 'Thác nước hùng vĩ nhất vùng Tây Bắc' },
      { label: 'Bãi thả dê', altitude: 2400, type: 'RIDGE', description: 'Đồng cỏ trên núi cao, view thoáng' },
      { label: 'Đỉnh Nhìu Cồ San', altitude: 2965, type: 'PEAK', description: 'Hai đỉnh núi kề nhau như sừng trâu' }
    ]
  },
  { 
    name: 'Ngũ Chỉ Sơn', 
    altitude: 2858, 
    province: 'Lào Cai',
    aliases: ['ngu chi son', 'ban tay phat', 'ngũ chỉ sơn', 'tả giàng phình'],
    elevation_profile: [
      { label: 'Tả Giàng Phình', altitude: 1200, type: 'VALLEY', description: 'Thung lũng lúa vàng, bản làng yên bình' },
      { label: 'Khe Núi', altitude: 2000, type: 'SLOPE', description: 'Rừng trúc rậm rạp, suối nhỏ' },
      { label: 'Vách Đá', altitude: 2600, type: 'RIDGE', description: 'Vách đá dựng đứng 90 độ cần leo thang' },
      { label: 'Đỉnh Ngũ Chỉ', altitude: 2858, type: 'PEAK', description: 'View 5 ngón tay Phật hùng vĩ' }
    ]
  },
  { 
    name: 'Thị trấn Sapa (Hàm Rồng)', 
    altitude: 1600, 
    province: 'Lào Cai',
    aliases: ['sapa', 'sa pa', 'ham rong', 'hàm rồng', 'sân mây', 'thị trấn mờ sương'],
    elevation_profile: [
      { label: 'Lào Cai', altitude: 300, type: 'VALLEY', description: 'Thành phố biên giới, sông Hồng' },
      { label: 'Cốc San', altitude: 800, type: 'SLOPE', description: 'Ruộng bậc thang dọc QL4D' },
      { label: 'TT. Sapa', altitude: 1600, type: 'RIDGE', description: 'Trung tâm du lịch, nhà thờ đá' },
      { label: 'Hàm Rồng', altitude: 1800, type: 'PEAK', description: 'Vườn hoa & Sân mây ngắm toàn cảnh' }
    ]
  },
  { 
    name: 'Ngải Thầu Thượng (Y Tý)', 
    altitude: 2100, 
    province: 'Lào Cai',
    aliases: ['ngải thầu', 'ngải thầu thượng', 'y tý', 'bát xát', 'ngai thau'],
    elevation_profile: [
      { label: 'Y Tý', altitude: 1900, type: 'VALLEY', description: 'Trung tâm xã Y Tý' },
      { label: 'Ngải Thầu', altitude: 2100, type: 'PEAK', description: 'Bản cao nhất Việt Nam, biển mây bồng bềnh' }
    ]
  },
  { 
    name: 'Đỉnh Cú Nhù San', 
    altitude: 2662, 
    province: 'Lào Cai',
    aliases: ['cú nhù san', 'cu nhu san', 'y tý'],
    elevation_profile: [
      { label: 'Y Tý', altitude: 1900, type: 'VALLEY', description: 'Trung tâm xã Y Tý' },
      { label: 'Đỉnh Cú Nhù San', altitude: 2662, type: 'PEAK', description: 'Đỉnh núi hoang sơ, view mây tuyệt đẹp' }
    ]
  },
  { 
    name: 'Nam Kang Ho Tao', 
    altitude: 2881, 
    province: 'Lào Cai',
    aliases: ['nam kang ho tao', 'nam kang', 'nậm cang'],
    elevation_profile: [
      { label: 'Bản Nậm Cang', altitude: 800, type: 'VALLEY', description: 'Bản người Dao Đỏ' },
      { label: 'Đỉnh Nam Kang', altitude: 2881, type: 'PEAK', description: 'Cung trekking khắc nghiệt nhất Tây Bắc' }
    ]
  },
  { 
    name: 'Bản Hang Đá (Sapa)', 
    altitude: 1800, 
    province: 'Lào Cai',
    aliases: ['hang đá', 'bản hang đá', 'sapa', 'hầu thào'],
    elevation_profile: [
      { label: 'Sapa', altitude: 1500, type: 'VALLEY', description: 'Thị trấn Sapa' },
      { label: 'Bản Hang Đá', altitude: 1800, type: 'PEAK', description: 'Điểm săn mây hoang sơ ít người biết' }
    ]
  },

  // --- YÊN BÁI ---
  { 
    name: 'Tà Xùa (Phu Sa Phìn - Yên Bái)', 
    altitude: 2865, 
    province: 'Yên Bái',
    aliases: ['ta xua trek', 'tram tau', 'phu sa phin', 'trạm tấu', 'tà xùa yên bái', 'ta xua yen bai'],
    elevation_profile: [
      { label: 'Bản Công', altitude: 1200, type: 'VALLEY', description: 'Bản người Thái, điểm xuất phát trekking' },
      { label: 'Đồi Cổ Rùa', altitude: 2100, type: 'RIDGE', description: 'Mỏm đá hình đầu rùa check-in nổi tiếng' },
      { label: 'Sống Lưng', altitude: 2400, type: 'RIDGE', description: 'Sống lưng khủng long mỏng dính, cực kỳ nguy hiểm' },
      { label: 'Đỉnh Tà Xùa', altitude: 2865, type: 'PEAK', description: 'Đỉnh cắm cờ Việt Nam, rừng rêu ma mị' }
    ]
  },
  { 
    name: 'Tà Chì Nhù (Đồi hoa tím)', 
    altitude: 2979, 
    province: 'Yên Bái',
    aliases: ['ta chi nhu', 'phu song sung', 'doi hoa tim', 'chung chua nha', 'tà chì nhù', 'chi pâu'],
    elevation_profile: [
      { label: 'Mỏ Chì', altitude: 1200, type: 'VALLEY', description: 'Khu vực khai khoáng cũ, suối nước' },
      { label: 'Lán nghỉ', altitude: 2400, type: 'SLOPE', description: 'Lán 2400m lộng gió, đồi trọc' },
      { label: 'Đồi Hoa Tím', altitude: 2700, type: 'RIDGE', description: 'Hoa Chi Pâu nở tím rực vào tháng 10' },
      { label: 'Đỉnh Tà Chì Nhù', altitude: 2979, type: 'PEAK', description: 'Đại dương mây Yên Bái, gió rất mạnh' }
    ]
  },
  { 
    name: 'Lùng Cúng', 
    altitude: 2913, 
    province: 'Yên Bái',
    aliases: ['lung cung', 'mu cang chai', 'lùng cúng', 'mù cang chải', 'tu san'],
    elevation_profile: [
      { label: 'Tu San', altitude: 1100, type: 'VALLEY', description: 'Bản làng người Mông, đường vào hiểm trở' },
      { label: 'Thảo nguyên', altitude: 2200, type: 'SLOPE', description: 'Bãi cỏ rộng mênh mông, lán nghỉ' },
      { label: 'Rừng già', altitude: 2600, type: 'RIDGE', description: 'Rừng nguyên sinh rậm rạp, dốc đứng' },
      { label: 'Đỉnh Lùng Cúng', altitude: 2913, type: 'PEAK', description: 'Sân bóng trên mây, view 360 độ' }
    ]
  },
  { 
    name: 'Đèo Khau Phạ', 
    altitude: 1200, 
    province: 'Yên Bái',
    aliases: ['khau phạ', 'đèo khau phạ', 'mù cang chải', 'khau pha'],
    elevation_profile: [
      { label: 'Tú Lệ', altitude: 600, type: 'VALLEY', description: 'Thung lũng Tú Lệ' },
      { label: 'Đỉnh đèo', altitude: 1200, type: 'PEAK', description: 'Tứ đại đỉnh đèo, điểm bay dù lượn trên biển mây' }
    ]
  },
  { 
    name: 'Đồi Mâm Xôi (Mù Cang Chải)', 
    altitude: 1000, 
    province: 'Yên Bái',
    aliases: ['mâm xôi', 'la pán tẩn', 'mù cang chải', 'mam xoi'],
    elevation_profile: [
      { label: 'Ngã 3 Kim', altitude: 700, type: 'VALLEY', description: 'Đường vào La Pán Tẩn' },
      { label: 'Đồi Mâm Xôi', altitude: 1000, type: 'PEAK', description: 'Ruộng bậc thang mâm xôi ngập trong mây sớm' }
    ]
  },

  // --- LAI CHÂU ---
  { 
    name: 'Putaleng', 
    altitude: 3049, 
    province: 'Lai Châu',
    aliases: ['putaleng', 'pu ta leng', 'tả lèng', 'tam đường'],
    elevation_profile: [
      { label: 'Hồ Thủy Điện', altitude: 800, type: 'VALLEY', description: 'Hồ chứa nước trong xanh, chân núi' },
      { label: 'Suối Lớn', altitude: 1500, type: 'SLOPE', description: 'Suối Thầu tắm mát, cắm trại tốt' },
      { label: 'Rừng Đỗ Quyên', altitude: 2600, type: 'RIDGE', description: 'Rừng hoa cổ thụ nở rực tháng 3-4' },
      { label: 'Đỉnh Putaleng', altitude: 3049, type: 'PEAK', description: 'Nóc nhà thứ 3 Đông Dương, rậm rạp' }
    ]
  },
  { 
    name: 'Pusilung (Biên giới)', 
    altitude: 3083, 
    province: 'Lai Châu',
    aliases: ['pusilung', 'moc 42', 'pa ve su', 'biên giới', 'pu si lung'],
    elevation_profile: [
      { label: 'Pa Vệ Sủ', altitude: 1400, type: 'VALLEY', description: 'Đồn biên phòng, điểm làm thủ tục' },
      { label: 'Mốc 42', altitude: 2800, type: 'RIDGE', description: 'Cột mốc biên giới Việt-Trung thiêng liêng' },
      { label: 'Dốc 3 Tiếng', altitude: 2500, type: 'SLOPE', description: 'Dốc leo liên tục 3h bào mòn thể lực' },
      { label: 'Đỉnh Pusilung', altitude: 3083, type: 'PEAK', description: 'Đỉnh núi hoang sơ, hành trình dài nhất' }
    ]
  },
  { 
    name: 'Tả Liên Sơn (Cổ Trâu)', 
    altitude: 2996, 
    province: 'Lai Châu',
    aliases: ['ta lien son', 'co trau', 'ta leng', 'tả liên', 'tả liên sơn'],
    elevation_profile: [
      { label: 'Tả Lèng', altitude: 1000, type: 'VALLEY', description: 'Bản người Dao, ruộng bậc thang' },
      { label: 'Rừng Cổ Thụ', altitude: 2200, type: 'SLOPE', description: 'Rừng rêu phong ma mị như cổ tích' },
      { label: 'Hốc Đá', altitude: 2600, type: 'RIDGE', description: 'Hang đá trú ẩn tự nhiên, rừng trúc' },
      { label: 'Đỉnh Tả Liên', altitude: 2996, type: 'PEAK', description: 'View nhìn sang Putaleng, rừng Đỗ Quyên' }
    ]
  },
  { 
    name: 'Đèo Ô Quy Hồ', 
    altitude: 2035, 
    province: 'Lai Châu',
    aliases: ['o quy ho', 'cong troi', 'deo o quy ho', 'ô quy hồ', 'cổng trời', 'o quy ho pass'],
    elevation_profile: [
      { label: 'Thác Bạc', altitude: 1700, type: 'VALLEY', description: 'Khu du lịch Thác Bạc, phía Sapa' },
      { label: 'Cổng Trời', altitude: 2035, type: 'PEAK', description: 'Đỉnh đèo cao nhất Việt Nam, gió mạnh' },
      { label: 'Cầu Kính', altitude: 2100, type: 'RIDGE', description: 'Khu du lịch Rồng Mây, thang máy ngoài trời' },
      { label: 'Chu Va', altitude: 1000, type: 'VALLEY', description: 'Thung lũng phía Lai Châu, trời ấm hơn' }
    ]
  },
  { 
    name: 'Sì Thâu Chải', 
    altitude: 1400, 
    province: 'Lai Châu',
    aliases: ['sì thâu chải', 'tam đường', 'si thau chai'],
    elevation_profile: [
      { label: 'Tam Đường', altitude: 800, type: 'VALLEY', description: 'Thị trấn Tam Đường' },
      { label: 'Sì Thâu Chải', altitude: 1400, type: 'PEAK', description: 'Bản du lịch cộng đồng, điểm bay dù lượn ngắm mây' }
    ]
  },

  // --- ĐIỆN BIÊN ---
  { 
    name: 'Đèo Pha Đin', 
    altitude: 1048, 
    province: 'Điện Biên',
    aliases: ['pha đin', 'đèo pha đin', 'pha din'],
    elevation_profile: [
      { label: 'Tuần Giáo', altitude: 500, type: 'VALLEY', description: 'Thị trấn Tuần Giáo' },
      { label: 'Đỉnh đèo', altitude: 1048, type: 'PEAK', description: 'Tứ đại đỉnh đèo, ranh giới Sơn La - Điện Biên' }
    ]
  },
  { 
    name: 'Cực Tây A Pa Chải', 
    altitude: 1864, 
    province: 'Điện Biên',
    aliases: ['a pa chải', 'cực tây', 'mường nhé', 'a pa chai'],
    elevation_profile: [
      { label: 'Đồn BP A Pa Chải', altitude: 1000, type: 'VALLEY', description: 'Đồn biên phòng' },
      { label: 'Mốc số 0', altitude: 1864, type: 'PEAK', description: 'Ngã ba biên giới Việt - Lào - Trung, biển mây cuồn cuộn' }
    ]
  },

  // --- HÒA BÌNH ---
  { 
    name: 'Lũng Vân (Nóc nhà xứ Mường)', 
    altitude: 1200, 
    province: 'Hòa Bình',
    aliases: ['lũng vân', 'tân lạc', 'lung van', 'nóc nhà xứ mường'],
    elevation_profile: [
      { label: 'Tân Lạc', altitude: 300, type: 'VALLEY', description: 'Trung tâm huyện' },
      { label: 'Lũng Vân', altitude: 1200, type: 'PEAK', description: 'Bản làng chìm trong sương mây quanh năm' }
    ]
  },
  { 
    name: 'Đèo Thung Khe (Đèo Đá Trắng)', 
    altitude: 1000, 
    province: 'Hòa Bình',
    aliases: ['thung khe', 'đèo đá trắng', 'mai châu', 'thung khe pass'],
    elevation_profile: [
      { label: 'Tân Lạc', altitude: 300, type: 'VALLEY', description: 'Đường lên đèo' },
      { label: 'Đỉnh đèo', altitude: 1000, type: 'PEAK', description: 'Chợ phiên trên đèo, sương mù dày đặc như tuyết' }
    ]
  }
];

export const SKY_CONDITIONS = [
  'Clear (Quang mây)',
  'Partly Cloudy (Có mây rải rác)',
  'Cloudy (Nhiều mây)',
  'Foggy (Sương mù)',
  'Rainy (Mưa)',
];
