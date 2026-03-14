import customtkinter as ctk


class AdminView(ctk.CTkFrame):
    def __init__(self, parent, controller, user_data):
        super().__init__(parent)
        self.controller = controller
        self.user_data = user_data
        self._build_layout()

    def _build_layout(self):
        header = ctk.CTkFrame(self)
        header.pack(fill="x", padx=12, pady=(12, 8))

        title = ctk.CTkLabel(
            header,
            text="Admin Dashboard",
            font=ctk.CTkFont(size=24, weight="bold"),
        )
        title.pack(side="left", padx=12, pady=12)

        user_label = ctk.CTkLabel(
            header,
            text=f"Logged in as: {self.user_data.get('username', 'admin')}",
            font=ctk.CTkFont(size=14),
        )
        user_label.pack(side="left", padx=8)

        billing_btn = ctk.CTkButton(
            header,
            text="Open Billing",
            command=lambda: self.controller.show_billing_screen(self.user_data),
            width=140,
        )
        billing_btn.pack(side="right", padx=12, pady=12)

        logout_btn = ctk.CTkButton(
            header,
            text="Logout",
            command=self.controller.show_login,
            width=100,
            fg_color="#B03030",
            hover_color="#8B2323",
        )
        logout_btn.pack(side="right", padx=(0, 8), pady=12)

        body = ctk.CTkFrame(self)
        body.pack(fill="both", expand=True, padx=12, pady=(0, 12))

        notice = ctk.CTkLabel(
            body,
            text=(
                "Admin modules (inventory, users, expenses, analytics) will be rendered here.\n"
                "Role gating is active: cashiers cannot access this screen."
            ),
            justify="left",
            font=ctk.CTkFont(size=15),
        )
        notice.pack(anchor="nw", padx=16, pady=16)
