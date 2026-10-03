import SwiftUI

/// The extension's palette (apps/extension/style.css), so phone and browser feel like one app.
enum Palette {
    static let ink = dynamic(0x17201C, 0xEEF2EF)
    static let muted = dynamic(0x7B8682, 0x8F9A96)
    static let faint = dynamic(0xB5BDB9, 0x55605B)
    static let line = dynamic(0xE8ECEA, 0x2C3330)
    static let soft = dynamic(0xF3F5F4, 0x232927)
    static let paper = dynamic(0xFFFFFF, 0x1A1F1D)
    static let jade = dynamic(0x0B7A5C, 0x4CC29B)
    static let jadeSoft = dynamic(0xE2F2EC, 0x173229)
    static let amber = dynamic(0xB45309, 0xF0A64A)
    static let amberSoft = dynamic(0xFDF1DF, 0x33240F)
    /// Grouped screens: a tinted page with lighter surfaces in light mode, the reverse in dark.
    static let page = dynamic(0xF3F5F4, 0x141917)
    static let surface = dynamic(0xFFFFFF, 0x222927)
    /// Text on a jade fill: white in light mode, near-black on the brighter dark-mode jade.
    static let onAccent = dynamic(0xFFFFFF, 0x0F1412)

    private static func dynamic(_ light: UInt32, _ dark: UInt32) -> Color {
        Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255, blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}

enum Typeface {
    /// Chinese text: PingFang HK, which has the Hong Kong character forms.
    static func hanzi(_ size: CGFloat, _ weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        let name = switch weight {
        case .semibold, .bold, .heavy, .black: "PingFangHK-Semibold"
        case .medium: "PingFangHK-Medium"
        case .light, .thin, .ultraLight: "PingFangHK-Light"
        default: "PingFangHK-Regular"
        }
        return .custom(name, size: size, relativeTo: style)
    }
}

extension View {
    /// Chinese text is marked as Cantonese so VoiceOver reads it with a Cantonese voice.
    func cantonese() -> some View { environment(\.locale, Locale(identifier: "zh-HK")) }
}
