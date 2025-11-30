use crate::coord;
use little_exif::exif_tag::ExifTag;
use little_exif::metadata::Metadata;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct WriteResult {
    pub file_path: String,
    pub success: bool,
}

pub fn write_exif_data(files: Vec<String>, coord_params: (f64, f64)) -> Vec<WriteResult> {
    // let files = utils::get_files_from_path(path_params);
    println!("待处理的文件如下所示:");
    println!("{:#?}", files);
    let r = coord::get_gps_exif_from_gcj02(coord_params.0, coord_params.1);

    let mut results = Vec::new();

    for file in files {
        let image_path = std::path::Path::new(&file);
        let mut metadata;
        match Metadata::new_from_path(&image_path) {
            Ok(m) => metadata = m,
            Err(_) => {
                results.push(WriteResult {
                    file_path: file.clone(),
                    success: false,
                });
                continue;
            }
        }
        // 经度
        metadata.set_tag(ExifTag::GPSLongitudeRef(r.0.clone()));
        metadata.set_tag(ExifTag::GPSLongitude(r.2.to_vec()));
        // 纬度
        metadata.set_tag(ExifTag::GPSLatitudeRef(r.1.clone()));
        metadata.set_tag(ExifTag::GPSLatitude(r.3.to_vec()));

        results.push(WriteResult {
            file_path: file.clone(),
            success: match metadata.write_to_file(&image_path) {
                Ok(_) => true,
                Err(_) => false,
            },
        });
    }

    results
}
