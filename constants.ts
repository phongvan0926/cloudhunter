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
    province: 'Sơn La / Hòa Bình',
    aliases: ['hang kia', 'pa co', 'pa cò', 'hang kia pa co', 'mai chau', 'mai châu'],
    elevation_profile: [
      { label: 'QL6 Mai Châu', altitude: 800, type: 'VALLEY', description: 'Đường quốc lộ huyết mạch' },
      { label: 'Dốc Cun', altitude: 1000, type: 'SLOPE', description: 'Dốc đá trắng hiểm trở, sương mù dày' },
      { label: 'Thung lũng Pà Cò', altitude: 1100, type: 'VALLEY', description: 'Thung lũng trồng mận, đào' },
      { label: 'Cổng Trời Hang Kia', altitude: 1200, type: 'PEAK', description: 'Điểm săn mây view toàn cảnh thung lũng' }
    ]
  },
  { 
    name: 'Xím Vàng', 
    altitude: 1500, 
    province: 'Sơn La',
    aliases: ['xim vang', 'ruong bac thang xim vang', 'xím vàng'],
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
    aliases: ['pu nhi', 'pu nhi farm', 'đồi pu nhi'],
    elevation_profile: [
      { label: 'TT. Bắc Yên', altitude: 300, type: 'VALLEY', description: 'Trung tâm huyện' },
      { label: 'Đồi Pu Nhi', altitude: 700, type: 'PEAK', description: 'Đồi cỏ rộng, view thung lũng mây' }
    ]
  },
  { 
    name: 'Đỉnh U Bò', 
    altitude: 1500, 
    province: 'Sơn La',
    aliases: ['u bò', 'đỉnh u bò', 'u bo'],
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
    aliases: ['fansipan', 'phan xi pang', 'phanxipang', 'hoang lien son', 'nóc nhà đông dương', 'đỉnh fansipan'],
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
    aliases: ['lao than', 'lảo thẩn', 'đỉnh lảo thẩn', 'mây lảo thẩn', 'đỉnh nhọn y tý'],
    elevation_profile: [
      { label: 'Chân núi Phìn Hồ', altitude: 1800, type: 'VALLEY', description: 'Trang trại rau Phìn Hồ, đường đất đỏ' },
      { label: 'Đồi cỏ cháy', altitude: 2200, type: 'SLOPE', description: 'Đồi cỏ vàng rực nắng, cây khô cô đơn' },
      { label: 'Lán A Hờ (2560m)', altitude: 2560, type: 'RIDGE', description: 'Hang đá & Lán nghỉ view biển mây trực diện' },
      { label: 'Đỉnh Lảo Thẩn', altitude: 2860, type: 'PEAK', description: 'Chóp inox 2860m, view dãy Hoàng Liên Sơn' }
    ]
  },
  { 
    name: 'Ngải Thầu Thượng (Y Tý)', 
    altitude: 2100, 
    province: 'Lào Cai',
    aliases: ['ngải thầu', 'ngải thầu thượng', 'ngai thau', 'ngai thau thuong', 'cổng trời ngải thầu'],
    elevation_profile: [
      { label: 'Thung lũng Thề Pả', altitude: 1500, type: 'VALLEY', description: 'Thung lũng ruộng bậc thang di tích quốc gia' },
      { label: 'Cổng Trời Ngải Thầu', altitude: 1900, type: 'SLOPE', description: 'Điểm đón luồng mây từ thung lũng tràn qua đèo' },
      { label: 'Lán ngắm mây', altitude: 2050, type: 'RIDGE', description: 'Khu vực homestay và điểm cắm trại săn mây' },
      { label: 'Đỉnh Ngải Thầu Thượng', altitude: 2100, type: 'PEAK', description: 'Bản làng cao nhất Việt Nam, biển mây bồng bềnh' }
    ]
  },
  { 
    name: 'Đỉnh Cú Nhù San', 
    altitude: 2662, 
    province: 'Lào Cai',
    aliases: ['cú nhù san', 'cu nhu san', 'núi cú nhù san'],
    elevation_profile: [
      { label: 'Bản Sàng Ma Sáo', altitude: 1200, type: 'VALLEY', description: 'Chân núi, ruộng bậc thang' },
      { label: 'Rừng chè cổ', altitude: 1900, type: 'SLOPE', description: 'Rừng cây gỗ lớn, nhiều rêu' },
      { label: 'Lán Cú Nhù San', altitude: 2300, type: 'RIDGE', description: 'Khu vực cắm trại lưng chừng núi' },
      { label: 'Đỉnh Cú Nhù San', altitude: 2662, type: 'PEAK', description: 'Đỉnh núi hoang sơ, view mây tuyệt đẹp' }
    ]
  },
  { 
    name: 'Ky Quan San (Bạch Mộc Lương Tử)', 
    altitude: 3046, 
    province: 'Lào Cai',
    aliases: ['ky quan san', 'bach moc luong tu', 'bach moc', 'sang ma sao', 'bạch mộc', 'núi muối', 'kqs', 'bach moc lao cai'],
    elevation_profile: [
      { label: 'Sàng Ma Sáo', altitude: 900, type: 'VALLEY', description: 'Bản người Mông chân núi, ruộng bậc thang' },
      { label: 'Lán Núi Muối (2100m)', altitude: 2100, type: 'RIDGE', description: 'Điểm ngắm bình minh và biển mây đẹp nhất hành trình' },
      { label: 'Sống lưng Khủng Long', altitude: 2800, type: 'RIDGE', description: 'Sống lưng mỏng hiểm trở, gió tạt mạnh' },
      { label: 'Đỉnh Ky Quan San', altitude: 3046, type: 'PEAK', description: 'Đỉnh cao thứ 4 Việt Nam, view 360 độ toàn cảnh' }
    ]
  },
  { 
    name: 'Nhìu Cồ San (Sừng Trâu)', 
    altitude: 2965, 
    province: 'Lào Cai',
    aliases: ['nhiu co san', 'sung trau', 'nhìu cồ san', 'nhiu cồ san', 'đỉnh sừng trâu'],
    elevation_profile: [
      { label: 'Bản Nhìu Cồ San', altitude: 1000, type: 'VALLEY', description: 'Bản có đường đá cổ Pavi, mùa hoa đào' },
      { label: 'Thác Ong Chúa', altitude: 1600, type: 'SLOPE', description: 'Thác nước hùng vĩ nhất vùng Tây Bắc' },
      { label: 'Bãi thả dê (2400m)', altitude: 2400, type: 'RIDGE', description: 'Đồng cỏ trên núi cao, view thoáng đãng' },
      { label: 'Đỉnh Nhìu Cồ San', altitude: 2965, type: 'PEAK', description: 'Hai đỉnh núi kề nhau như sừng trâu vươn trên mây' }
    ]
  },
  { 
    name: 'Ngũ Chỉ Sơn', 
    altitude: 2858, 
    province: 'Lào Cai',
    aliases: ['ngu chi son', 'ban tay phat', 'ngũ chỉ sơn', 'tả giàng phình'],
    elevation_profile: [
      { label: 'Tả Giàng Phình', altitude: 1200, type: 'VALLEY', description: 'Thung lũng lúa vàng, bản làng yên bình' },
      { label: 'Khe Núi Rừng Trúc', altitude: 2000, type: 'SLOPE', description: 'Rừng trúc rậm rạp, suối nhỏ' },
      { label: 'Vách Đá Thang Dây', altitude: 2600, type: 'RIDGE', description: 'Vách đá dựng đứng 90 độ cần leo thang' },
      { label: 'Đỉnh Ngũ Chỉ Sơn', altitude: 2858, type: 'PEAK', description: 'View 5 ngón tay Phật hùng vĩ trên biển mây' }
    ]
  },
  { 
    name: 'Thị trấn Sapa (Hàm Rồng)', 
    altitude: 1600, 
    province: 'Lào Cai',
    aliases: ['thị trấn sapa', 'sa pa', 'ham rong', 'hàm rồng', 'sân mây sapa', 'thị trấn mờ sương'],
    elevation_profile: [
      { label: 'Thung lũng Mường Hoa', altitude: 1200, type: 'VALLEY', description: 'Ruộng bậc thang Mường Hoa' },
      { label: 'TT. Sapa', altitude: 1600, type: 'SLOPE', description: 'Trung tâm du lịch, nhà thờ đá' },
      { label: 'Đỉnh Hàm Rồng', altitude: 1800, type: 'PEAK', description: 'Sân Mây ngắm toàn cảnh Fansipan và thung lũng' }
    ]
  },
  { 
    name: 'Bản Hang Đá (Sapa)', 
    altitude: 1800, 
    province: 'Lào Cai',
    aliases: ['hang đá', 'bản hang đá', 'hang da sapa', 'hầu thào'],
    elevation_profile: [
      { label: 'Thung lũng Mường Hoa', altitude: 1300, type: 'VALLEY', description: 'Chân núi, ruộng bậc thang' },
      { label: 'Sườn Hầu Thào', altitude: 1600, type: 'SLOPE', description: 'Đường mòn ven sườn núi' },
      { label: 'Bản Hang Đá', altitude: 1800, type: 'PEAK', description: 'Điểm săn mây hoang sơ nhìn thẳng xuống biển mây' }
    ]
  },

  // --- YÊN BÁI ---
  { 
    name: 'Tà Chì Nhù (Đồi hoa tím)', 
    altitude: 2979, 
    province: 'Yên Bái',
    aliases: ['ta chi nhu', 'phu song sung', 'doi hoa tim', 'chung chua nha', 'tà chì nhù', 'chi pâu', 'trạm tấu'],
    elevation_profile: [
      { label: 'Mỏ Chì Trạm Tấu', altitude: 1200, type: 'VALLEY', description: 'Khu vực khai khoáng cũ, suối nước' },
      { label: 'Lán nghỉ 2400m', altitude: 2400, type: 'SLOPE', description: 'Lán 2400m lộng gió, đồi trọc' },
      { label: 'Đồi Hoa Tím Chi Pâu', altitude: 2700, type: 'RIDGE', description: 'Hoa Chi Pâu nở tím rực, biển mây ôm sườn' },
      { label: 'Đỉnh Tà Chì Nhù', altitude: 2979, type: 'PEAK', description: 'Đại dương mây Yên Bái bao la 360 độ' }
    ]
  },
  { 
    name: 'Lùng Cúng', 
    altitude: 2913, 
    province: 'Yên Bái',
    aliases: ['lung cung', 'lùng cúng', 'đỉnh lùng cúng', 'tu san'],
    elevation_profile: [
      { label: 'Bản Tu San', altitude: 1100, type: 'VALLEY', description: 'Bản làng người Mông, đường vào hiểm trở' },
      { label: 'Thảo nguyên lán nghỉ', altitude: 2200, type: 'SLOPE', description: 'Bãi cỏ rộng mênh mông, lán nghỉ' },
      { label: 'Rừng già nguyên sinh', altitude: 2600, type: 'RIDGE', description: 'Rừng cổ thụ rậm rạp, dốc đứng' },
      { label: 'Đỉnh Lùng Cúng', altitude: 2913, type: 'PEAK', description: 'Sân bóng trên mây phẳng rộng, view 360 độ' }
    ]
  },
  { 
    name: 'Đèo Khau Phạ', 
    altitude: 1500, 
    province: 'Yên Bái',
    aliases: ['khau phạ', 'đèo khau phạ', 'khau pha', 'đèo khau pha'],
    elevation_profile: [
      { label: 'Thung lũng Tú Lệ', altitude: 600, type: 'VALLEY', description: 'Thung lũng nếp thơm Tú Lệ' },
      { label: 'Đèo Khau Phạ (Điểm Dù Lượn)', altitude: 1200, type: 'SLOPE', description: 'Điểm cất cánh dù lượn lướt trên mây' },
      { label: 'Đỉnh Đèo Khau Phạ', altitude: 1500, type: 'PEAK', description: 'Tứ đại đỉnh đèo Tây Bắc, mây cuộn quanh năm' }
    ]
  },
  { 
    name: 'Mù Cang Chải (Đồi Mâm Xôi)', 
    altitude: 1000, 
    province: 'Yên Bái',
    aliases: ['mâm xôi', 'la pán tẩn', 'mù cang chải', 'mam xoi', 'mu cang chai', 'đồi móng ngựa'],
    elevation_profile: [
      { label: 'Ngã 3 Kim', altitude: 700, type: 'VALLEY', description: 'Đường vào xã La Pán Tẩn' },
      { label: 'Đồi Móng Ngựa', altitude: 950, type: 'SLOPE', description: 'Ruộng bậc thang hình bán nguyệt ngắm hoàng hôn' },
      { label: 'Đồi Mâm Xôi', altitude: 1000, type: 'PEAK', description: 'Ruộng bậc thang mâm xôi ngập trong biển mây sớm' }
    ]
  },

  // --- HÀ GIANG ---
  { 
    name: 'Đèo Mã Pí Lèng (Mèo Vạc)', 
    altitude: 1400, 
    province: 'Hà Giang',
    aliases: ['mã pí lèng', 'ma pi leng', 'mèo vạc', 'mã pì lèng', 'sông nho quế', 'đèo mã pí lèng'],
    elevation_profile: [
      { label: 'Bến thuyền Sông Nho Quế', altitude: 350, type: 'VALLEY', description: 'Dòng sông ngọc bích sâu thẳm dưới hẻm vực' },
      { label: 'Hẻm Tu Sản', altitude: 600, type: 'SLOPE', description: 'Hẻm vực sâu nhất Đông Nam Á' },
      { label: 'Điểm dừng chân Panorama', altitude: 1200, type: 'RIDGE', description: 'View nhìn trọn vẹn sống núi và biển mây' },
      { label: 'Đỉnh Đèo Mã Pí Lèng', altitude: 1400, type: 'PEAK', description: 'Tứ đại đỉnh đèo, gió lộng và mây cuồn cuộn' }
    ]
  },
  { 
    name: 'Đỉnh Chiêu Lầu Thi', 
    altitude: 2402, 
    province: 'Hà Giang',
    aliases: ['chiêu lầu thi', 'chieu lau thi', 'hoàng su phì', 'hoang su phi', 'đỉnh chiêu lầu thi'],
    elevation_profile: [
      { label: 'Chân núi Hồ Thầu', altitude: 1000, type: 'VALLEY', description: 'Bản người Dao, ruộng bậc thang Hoàng Su Phì' },
      { label: 'Rừng Chè Shan Tuyết', altitude: 1600, type: 'SLOPE', description: 'Vườn chè cổ thụ hàng trăm năm tuổi' },
      { label: 'Lán nghỉ 2000m', altitude: 2000, type: 'RIDGE', description: 'Lán nghỉ chân ngắm biển mây lúc bình minh' },
      { label: 'Đỉnh Chiêu Lầu Thi', altitude: 2402, type: 'PEAK', description: 'Chóp kim loại 2402m, mây cuộn 9 tầng' }
    ]
  },
  { 
    name: 'Tây Côn Lĩnh', 
    altitude: 2427, 
    province: 'Hà Giang',
    aliases: ['tây côn lĩnh', 'tay con linh', 'nóc nhà hà giang', 'đỉnh tây côn lĩnh'],
    elevation_profile: [
      { label: 'Bản Cao Bồ', altitude: 800, type: 'VALLEY', description: 'Bản làng trù phú dưới chân núi' },
      { label: 'Lán Thảo Quả', altitude: 1700, type: 'SLOPE', description: 'Rừng trồng thảo quả râm mát' },
      { label: 'Rừng Rêu Cổ Thụ', altitude: 2200, type: 'RIDGE', description: 'Rừng nguyên sinh bám đầy rêu phong huyền bí' },
      { label: 'Đỉnh Tây Côn Lĩnh', altitude: 2427, type: 'PEAK', description: 'Nóc nhà Đông Bắc, biển mây hùng tráng' }
    ]
  },
  { 
    name: 'Cao nguyên đá Đồng Văn', 
    altitude: 1500, 
    province: 'Hà Giang',
    aliases: ['đồng văn', 'dong van', 'cao nguyên đá', 'cột cờ lũng cú'],
    elevation_profile: [
      { label: 'Phố Cổ Đồng Văn', altitude: 1100, type: 'VALLEY', description: 'Thung lũng đá vôi, chợ phiên truyền thống' },
      { label: 'Đèo Mã Lé', altitude: 1300, type: 'SLOPE', description: 'Đường đèo uốn lượn giữa rừng đá tai mèo' },
      { label: 'Cột Cờ Lũng Cú', altitude: 1500, type: 'PEAK', description: 'Điểm cực Bắc thiêng liêng, mây giăng đỉnh núi' }
    ]
  },

  // --- LAI CHÂU ---
  { 
    name: 'Putaleng', 
    altitude: 3049, 
    province: 'Lai Châu',
    aliases: ['putaleng', 'pu ta leng', 'tả lèng', 'đỉnh putaleng'],
    elevation_profile: [
      { label: 'Hồ Thủy Điện Tả Lèng', altitude: 800, type: 'VALLEY', description: 'Chân núi, điểm tập kết' },
      { label: 'Suối Lớn (1500m)', altitude: 1500, type: 'SLOPE', description: 'Suối Thầu trong vắt, bãi cắm trại' },
      { label: 'Rừng Đỗ Quyên Cổ Thụ', altitude: 2600, type: 'RIDGE', description: 'Rừng hoa cổ thụ nở rực rỡ tháng 3-4' },
      { label: 'Đỉnh Putaleng', altitude: 3049, type: 'PEAK', description: 'Nóc nhà thứ 3 Đông Dương, biển mây tuyệt đẹp' }
    ]
  },
  { 
    name: 'Tả Liên Sơn (Cổ Trâu)', 
    altitude: 2996, 
    province: 'Lai Châu',
    aliases: ['ta lien son', 'co trau', 'tả liên', 'tả liên sơn', 'đỉnh tả liên'],
    elevation_profile: [
      { label: 'Bản Tả Lèng', altitude: 1000, type: 'VALLEY', description: 'Bản người Dao, ruộng bậc thang' },
      { label: 'Rừng Cổ Thụ Rêu Phong', altitude: 2200, type: 'SLOPE', description: 'Khu rừng rêu ma mị như xứ sở cổ tích' },
      { label: 'Hốc Đá 2600m', altitude: 2600, type: 'RIDGE', description: 'Hang đá tự nhiên che chở cho người trekking' },
      { label: 'Đỉnh Tả Liên Sơn', altitude: 2996, type: 'PEAK', description: 'View nhìn sang Putaleng và biển mây ngút ngàn' }
    ]
  },
  { 
    name: 'Đèo Ô Quy Hồ', 
    altitude: 2035, 
    province: 'Lai Châu / Lào Cai',
    aliases: ['o quy ho', 'cổng trời ô quy hồ', 'deo o quy ho', 'ô quy hồ', 'cầu kính rồng mây'],
    elevation_profile: [
      { label: 'Thác Bạc (Sapa)', altitude: 1700, type: 'VALLEY', description: 'Khu du lịch Thác Bạc' },
      { label: 'Cổng Trời Ô Quy Hồ', altitude: 2035, type: 'PEAK', description: 'Đỉnh đèo cao nhất Việt Nam, hoàng hôn biển mây' },
      { label: 'Cầu Kính Rồng Mây', altitude: 2100, type: 'RIDGE', description: 'Thang máy lồng kính ngắm mây trôi dưới chân' }
    ]
  },

  // --- THANH HÓA ---
  { 
    name: 'Pù Luông', 
    altitude: 1700, 
    province: 'Thanh Hóa',
    aliases: ['pù luông', 'pu luong', 'bá thước', 'đỉnh pù luông', 'bản đôn pù luông'],
    elevation_profile: [
      { label: 'Bản Đôn', altitude: 400, type: 'VALLEY', description: 'Thung lũng homestay và ruộng bậc thang' },
      { label: 'Bản Hiêu - Thác Hiêu', altitude: 700, type: 'SLOPE', description: 'Dòng thác nước trong veo giữa rừng' },
      { label: 'Đỉnh Đèo Son Bá Mười', altitude: 1200, type: 'RIDGE', description: 'Khu vực quanh năm mát lạnh, biển mây sớm' },
      { label: 'Đỉnh Pù Luông', altitude: 1700, type: 'PEAK', description: 'Nóc nhà Thanh Hóa, view thung lũng mây' }
    ]
  },

  // --- VĨNH PHÚC & HÀ NỘI ---
  { 
    name: 'Tam Đảo', 
    altitude: 1200, 
    province: 'Vĩnh Phúc',
    aliases: ['tam đảo', 'tam dao', 'thị trấn tam đảo', 'đỉnh rùng rình'],
    elevation_profile: [
      { label: 'Chân đèo Tam Đảo', altitude: 200, type: 'VALLEY', description: 'Điểm khởi hành lên núi' },
      { label: 'TT. Tam Đảo', altitude: 900, type: 'SLOPE', description: 'Thị trấn trong sương, Cầu Mây' },
      { label: 'Tháp Truyền Hình', altitude: 1150, type: 'RIDGE', description: 'Đường leo 1400 bậc đá xuyên rừng' },
      { label: 'Đỉnh Rùng Rình', altitude: 1200, type: 'PEAK', description: 'Đỉnh núi cao nhất ngắm biển mây đồng bằng' }
    ]
  },
  { 
    name: 'Đỉnh Ba Vì (Đỉnh Vua)', 
    altitude: 1280, 
    province: 'Hà Nội',
    aliases: ['ba vì', 'ba vi', 'đỉnh vua', 'núi ba vì', 'đền thượng ba vì'],
    elevation_profile: [
      { label: 'Chân VQG Ba Vì', altitude: 100, type: 'VALLEY', description: 'Cổng vào vườn quốc gia' },
      { label: 'Cốt 400m', altitude: 400, type: 'SLOPE', description: 'Rừng thông và khu phế tích Pháp cổ' },
      { label: 'Cốt 1100m', altitude: 1100, type: 'RIDGE', description: 'Bãi đỗ xe và đường leo các đỉnh núi' },
      { label: 'Đỉnh Vua (Đền Bác Hồ)', altitude: 1280, type: 'PEAK', description: 'Đỉnh cao nhất Ba Vì ngắm trọn sông Đà và mây' }
    ]
  },
  { 
    name: 'Mẫu Sơn (Lạng Sơn)', 
    altitude: 1500, 
    province: 'Lạng Sơn',
    aliases: ['mẫu sơn', 'mau son', 'đỉnh mẫu sơn', 'lạng sơn'],
    elevation_profile: [
      { label: 'Chân núi Lộc Bình', altitude: 300, type: 'VALLEY', description: 'Khu vực chân núi' },
      { label: 'Dốc Mẫu Sơn', altitude: 900, type: 'SLOPE', description: 'Đường đèo uốn lượn trong mây mù' },
      { label: 'Khu Biệt Thự Cổ', altitude: 1200, type: 'RIDGE', description: 'Khu nghỉ dưỡng Pháp cổ, điểm ngắm tuyết và mây' },
      { label: 'Đỉnh Mẫu Sơn', altitude: 1500, type: 'PEAK', description: 'Nơi đón không khí lạnh sớm nhất Việt Nam, biển mây dày' }
    ]
  },

  // --- BỔ SUNG 8/2026: điểm săn mây hot 2025-2026 (tọa độ xác minh OSM + DEM trong MOUNTAIN_DB) ---
  {
    name: 'Sa Mu - U Bò (2756m)',
    altitude: 2756,
    province: 'Sơn La',
    aliases: ['sa mu', 'samu', 'sa mu u bò', 'u bò 2756', 'háng đồng', 'sa mu u bo'],
    elevation_profile: [
      { label: 'Bản Chống Tra', altitude: 1400, type: 'VALLEY', description: 'Điểm xuất phát trek từ xã Háng Đồng (Bắc Yên)' },
      { label: 'Lán nghỉ 2200m', altitude: 2200, type: 'SLOPE', description: 'Lán ngủ đêm giữa rừng già' },
      { label: 'Rừng rêu cổ tích', altitude: 2500, type: 'RIDGE', description: 'Rừng rêu nguyên sinh nổi tiếng nhất cung này' },
      { label: 'Đỉnh Sa Mu (U Bò)', altitude: 2756, type: 'PEAK', description: 'Chóp inox trong KBT Tà Xùa, biển mây 2 hướng Sơn La - Yên Bái' }
    ]
  },
  {
    name: 'Bình Liêu - Cao Xiêm (Sống lưng khủng long)',
    altitude: 1429,
    province: 'Quảng Ninh',
    aliases: ['bình liêu', 'cao xiêm', 'mốc 1305', 'sống lưng khủng long bình liêu', 'cỏ lau']
  },
  {
    name: 'Phia Oắc (Cao Bằng)',
    altitude: 1931,
    province: 'Cao Bằng',
    aliases: ['phia oắc', 'phja oắc', 'phia đén', 'nguyên bình']
  },
  {
    name: 'Bạch Mã (Vọng Hải Đài)',
    altitude: 1448,
    province: 'Huế',
    aliases: ['bạch mã', 'vọng hải đài', 'vườn quốc gia bạch mã']
  },
  {
    name: 'Núi Bà Đen (Tây Ninh)',
    altitude: 986,
    province: 'Tây Ninh',
    aliases: ['bà đen', 'đĩa mây', 'nóc nhà nam bộ']
  },
  {
    name: 'Măng Đen',
    altitude: 1200,
    province: 'Kon Tum (Măng Đen)',
    aliases: ['măng đen', 'kon plông', 'đồi đức mẹ']
  },
  {
    name: 'Đồi chè Cầu Đất (Đà Lạt)',
    altitude: 1500,
    province: 'Lâm Đồng',
    aliases: ['cầu đất', 'đồi chè cầu đất', 'săn mây đà lạt', 'cầu đất farm']
  },
  {
    name: 'Núi Lang Biang',
    altitude: 2167,
    province: 'Lâm Đồng',
    aliases: ['lang biang', 'langbiang', 'lạc dương']
  },
  {
    name: 'Linh Quy Pháp Ấn (Bảo Lộc)',
    altitude: 850,
    province: 'Lâm Đồng',
    aliases: ['linh quy pháp ấn', 'cổng trời bảo lộc']
  },
  {
    name: 'Tà Năng - Phan Dũng',
    altitude: 1100,
    province: 'Lâm Đồng',
    aliases: ['tà năng', 'phan dũng', 'tà năng phan dũng']
  },

  // --- BỔ SUNG 8/2026 (đợt 2): điểm ít người biết do user tìm, tọa độ đã xác minh ---
  {
    name: 'Phình Hồ (Trạm Tấu)',
    altitude: 1080,
    province: 'Yên Bái (nay Lào Cai)',
    aliases: ['phình hồ', 'săn mây phình hồ', 'đồi chè phình hồ']
  },
  {
    name: 'Làng Nhì (Trạm Tấu)',
    altitude: 950,
    province: 'Yên Bái (nay Lào Cai)',
    aliases: ['làng nhì', 'đỉnh săn mây làng nhì']
  },
  {
    name: 'Đồi săn mây Tả Lèng (Lai Châu)',
    altitude: 1360,
    province: 'Lai Châu',
    aliases: ['săn mây tả lèng', 'săn mây lai châu', 'đồi săn mây tả lèng']
  },
  {
    name: 'Điểm săn mây Ngọc Sơn (Lạc Sơn)',
    altitude: 390,
    province: 'Hòa Bình (nay Phú Thọ)',
    aliases: ['ngọc sơn', 'lạc sơn', 'săn mây ngọc sơn']
  },
  {
    name: 'Kéo Lồm - Phiêng Pằn (Mai Sơn)',
    altitude: 860,
    province: 'Sơn La',
    aliases: ['kéo lồm', 'phiêng pằn', 'săn mây kéo lồm']
  },
  {
    name: 'Đồn Đèn (Ba Bể)',
    altitude: 660,
    province: 'Bắc Kạn (nay Thái Nguyên)',
    aliases: ['đồn đèn', 'ba bể', 'săn mây đồn đèn']
  },
  {
    name: 'Điểm săn mây Bản Nà (Tân Yên)',
    altitude: 740,
    province: 'Sơn La',
    aliases: ['bản nà', 'tân yên', 'săn mây bản nà']
  },
  {
    name: 'Điểm săn mây Chiềng Công (Mường La)',
    altitude: 1350,
    province: 'Sơn La',
    aliases: ['chiềng công', 'chiềng hoa', 'săn mây chiềng công']
  }
];

export const SKY_CONDITIONS = [
  'Clear (Quang mây)',
  'Partly Cloudy (Có mây rải rác)',
  'Cloudy (Nhiều mây)',
  'Foggy (Sương mù)',
  'Rainy (Mưa)',
];
