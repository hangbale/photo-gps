use std::path::Path;

pub enum PathType {
    File,
    Dir,
    Other,
}

pub fn get_path_type(path: &str) -> PathType {
    let metadata = Path::new(path).metadata().unwrap(); // 获取元数据，处理错误

    if metadata.is_dir() {
        PathType::Dir
    } else if metadata.is_file() {
        PathType::File
    } else {
        PathType::Other
    }
}

pub fn get_dir_files(path: &str) -> Vec<String> {
    let files = std::fs::read_dir(path).unwrap();
    // 过滤隐藏文件
    let mut list = vec![];
    for file in files {
        let file = file.unwrap();
        if !is_hidden(&file) {
            list.push(file.path().to_string_lossy().to_string());
        }
    }
    list
}

pub fn get_files_from_path(path: &str) -> Vec<String> {
    match get_path_type(path) {
        PathType::File => vec![path.to_string()],
        PathType::Dir => get_dir_files(path),
        PathType::Other => vec![],
    }
}
// 跨平台隐藏文件判断
fn is_hidden(entry: &std::fs::DirEntry) -> bool {
    #[cfg(unix)] 
    {
        entry.file_name()
            .to_str()
            .map(|s| s.starts_with('.'))
            .unwrap_or(false)
    }

    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        entry.metadata()
            .map(|md| md.file_attributes() & 0x2 != 0) // 0x2 是隐藏属性
            .unwrap_or(false)
    }

    #[cfg(not(any(unix, windows)))]
    {
        false
    }
}