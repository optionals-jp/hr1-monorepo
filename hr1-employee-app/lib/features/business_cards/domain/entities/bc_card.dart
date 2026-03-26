/// 名刺画像
class BcCard {
  const BcCard({
    required this.id,
    required this.organizationId,
    this.contactId,
    required this.imageUrl,
    this.rawText,
    required this.scannedBy,
    required this.scannedAt,
    required this.createdAt,
  });

  final String id;
  final String organizationId;
  final String? contactId;
  final String imageUrl;
  final String? rawText;
  final String scannedBy;
  final DateTime scannedAt;
  final DateTime createdAt;

  factory BcCard.fromJson(Map<String, dynamic> json) {
    return BcCard(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      contactId: json['contact_id'] as String?,
      imageUrl: json['image_url'] as String,
      rawText: json['raw_text'] as String?,
      scannedBy: json['scanned_by'] as String,
      scannedAt: DateTime.parse(json['scanned_at'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'contact_id': contactId,
      'image_url': imageUrl,
      'raw_text': rawText,
    };
  }
}
