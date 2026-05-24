import 'package:equatable/equatable.dart';

class Workshop extends Equatable {
  const Workshop({required this.id, this.name, this.slug});

  factory Workshop.fromJson(Map<String, dynamic> json) {
    return Workshop(
      id: json['id'] as String,
      name: json['name'] as String?,
      slug: json['slug'] as String?,
    );
  }

  final String id;
  final String? name;
  final String? slug;

  Map<String, dynamic> toJson() => {'id': id, 'name': name, 'slug': slug};

  @override
  List<Object?> get props => [id, name, slug];
}

class AuthState extends Equatable {
  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.error,
    this.user,
    this.workshops = const [],
    this.selectedWorkshopId,
    this.needsWorkshopSelection = false,
  });

  final bool isLoading;
  final bool isAuthenticated;
  final String? error;
  final Map<String, dynamic>? user;
  final List<Workshop> workshops;
  final String? selectedWorkshopId;
  final bool needsWorkshopSelection;

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    String? error,
    Map<String, dynamic>? user,
    List<Workshop>? workshops,
    String? selectedWorkshopId,
    bool? needsWorkshopSelection,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      error: error,
      user: user ?? this.user,
      workshops: workshops ?? this.workshops,
      selectedWorkshopId: selectedWorkshopId ?? this.selectedWorkshopId,
      needsWorkshopSelection:
          needsWorkshopSelection ?? this.needsWorkshopSelection,
    );
  }

  @override
  List<Object?> get props => [
        isLoading,
        isAuthenticated,
        error,
        user,
        workshops,
        selectedWorkshopId,
        needsWorkshopSelection,
      ];
}