use little_exif::exif_tag::ExifTag::{
    GPSLongitudeRef,
    GPSLongitude,
    GPSLatitudeRef,
    GPSLatitude
};
use little_exif::metadata::Metadata;
use crate::coord;
pub fn read_exif_data(file_path: &str) -> Option<Metadata> {
    let image_path = std::path::Path::new(file_path);
    match Metadata::new_from_path(&image_path) {
        Ok(metadata) => Some(metadata),
        Err(_) => None,
    }
}



/// 获取经纬度并直接转换为 (经度, 纬度) 的 f64 格式
pub fn get_gps_coords(metadata: &Metadata) -> Option<(f64, f64)> {
    // little_exif 的 get_tag 需要传入一个该类型的实例作为 key
    // 并且返回的是包含数据的枚举变体，需要解构

    let lon_ref = match metadata.get_tag(&GPSLongitudeRef(String::new())).next() {
        Some(GPSLongitudeRef(val)) => val,
        _ => return None,
    };
    let lat_ref = match metadata.get_tag(&GPSLatitudeRef(String::new())).next() {
        Some(GPSLatitudeRef(val)) => val,
        _ => return None,
    };

    let lon_dms = match metadata.get_tag(&GPSLongitude(vec![])).next() {
        Some(GPSLongitude(val)) => val,
        _ => return None,
    };


    let lat_dms = match metadata.get_tag(&GPSLatitude(vec![])).next() {
        Some(GPSLatitude(val)) => val,
        _ => return None,
    };

    let longitude = coord::dms_to_decimal(lon_dms, lon_ref);
    let latitude = coord::dms_to_decimal(lat_dms, lat_ref);

    Some((longitude, latitude))
}

pub fn get_gps_from_image(file_path: &str) -> Option<(f64, f64)> {
    let metadata = read_exif_data(file_path)?;
    let coords = get_gps_coords(&metadata)?;
    let gcj02_coords = coord::wgs84_into_gcj02(coords.0, coords.1);
    Some(gcj02_coords)
}