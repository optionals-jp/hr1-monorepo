/// 添付ファイル名と拡張子から MIME を推定する。
///
/// クライアント側は表示・初期判定にのみ使う。安全性を要する判定は
/// DB の check 制約 / Storage policy に委ねる。
String guessAttachmentMime(String fileName, String? extension) {
  final ext = (extension ?? fileName.split('.').last).toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'txt':
      return 'text/plain';
    case 'csv':
      return 'text/csv';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    default:
      return 'application/octet-stream';
  }
}

/// 添付ファイルのサイズ上限（25MB）。
const int kMaxAttachmentBytes = 25 * 1024 * 1024;
