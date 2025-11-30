use coordtransform_rs::{gcj02_to_wgs84, wgs84_to_gcj02};

use little_exif::rational;
pub fn gcj02_into_wgs84(lon: f64, lat: f64) -> (f64, f64) {
    let t = gcj02_to_wgs84(lon, lat);
    println!("转换后坐标为 {} {}", t.0, t.1);
    t
}
pub fn wgs84_into_gcj02(lon: f64, lat: f64) -> (f64, f64) {
    let t = wgs84_to_gcj02(lon, lat);
    println!("转换后坐标为 {} {}", t.0, t.1);
    t
}
// 将十进制经纬度转换为 EXIF 所需的度分秒格式
pub fn decimal_to_dms(decimal: f64, is_longitude: bool) -> (String, [rational::uR64; 3]) {
    // 确定正负和方向标识
    let (direction, abs_decimal) = get_direction_and_abs(decimal, is_longitude);

    // 分离度、分、秒
    let degrees = abs_decimal.trunc() as u32;
    let remainder = (abs_decimal - degrees as f64) * 60.0;

    let minutes = remainder.trunc() as u32;
    let seconds = (remainder - minutes as f64) * 60.0;

    // 构造 Rational 数组
    let dms = [
        rational::uR64 { nominator: degrees, denominator: 1 },          // 度
        rational::uR64 { nominator: minutes, denominator: 1 },          // 分
        convert_seconds_to_rational(seconds), // 秒（高精度处理）
    ];

    (direction, dms)
}
// 将度分秒格式的有理数数组转换为十进制浮点数
pub fn dms_to_decimal(dms: &[rational::uR64], ref_str: &str) -> f64 {
    if dms.len() < 3 { return 0.0; }

    let degrees = dms[0].nominator as f64 / dms[0].denominator as f64;
    let minutes = dms[1].nominator as f64 / dms[1].denominator as f64;
    let seconds = dms[2].nominator as f64 / dms[2].denominator as f64;

    let mut decimal = degrees + (minutes / 60.0) + (seconds / 3600.0);
    
    // 如果是西经(W)或南纬(S)，坐标为负
    if ref_str.eq_ignore_ascii_case("W") || ref_str.eq_ignore_ascii_case("S") {
        decimal = -decimal;
    }
    
    decimal
}

/// 获取方向标识并返回绝对值坐标
pub fn get_direction_and_abs(decimal: f64, is_longitude: bool) -> (String, f64) {
    match (decimal >= 0.0, is_longitude) {
        (true, true) => ("E".to_string(), decimal),
        (false, true) => ("W".to_string(), -decimal),
        (true, false) => ("N".to_string(), decimal),
        (false, false) => ("S".to_string(), -decimal),
    }
}

/// 将秒的小数转换为有理数（保留4位小数精度）
pub fn convert_seconds_to_rational(seconds: f64) -> rational::uR64 {
    // 放大 10^4 倍保留精度（相当于保留4位小数）
    const PRECISION: u32 = 10_000;
    let scaled = (seconds * PRECISION as f64).round() as u32;
    rational::uR64 { nominator: scaled, denominator: PRECISION }
}

pub fn get_gps_exif_from_gcj02(lon: f64, lat: f64) -> (String, String, [rational::uR64; 3], [rational::uR64; 3]) {
    let (lon, lat) = gcj02_into_wgs84(lon, lat);
    let (lon_direction, lon_dms) = decimal_to_dms(lon, true);
    let (lat_direction, lat_dms) = decimal_to_dms(lat, false);
    (lon_direction, lat_direction, lon_dms, lat_dms)
}