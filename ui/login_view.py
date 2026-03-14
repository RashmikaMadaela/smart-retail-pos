import customtkinter as ctk
from tkinter import messagebox
from utils.auth import verify_login

class LoginView(ctk.CTkFrame):
    def __init__(self, parent, controller):
        super().__init__(parent, fg_color="transparent")
        self.controller = controller

        # --- UI Layout ---
        # A stylish container frame in the center
        self.login_box = ctk.CTkFrame(self, width=400, height=400, corner_radius=15)
        self.login_box.place(relx=0.5, rely=0.5, anchor="center")

        self.title_label = ctk.CTkLabel(self.login_box, text="Smart Retail POS", font=ctk.CTkFont(size=28, weight="bold"))
        self.title_label.pack(pady=(40, 30))

        self.username_entry = ctk.CTkEntry(self.login_box, placeholder_text="Username", width=250, height=40)
        self.username_entry.pack(pady=10)

        self.password_entry = ctk.CTkEntry(self.login_box, placeholder_text="Password", show="*", width=250, height=40)
        self.password_entry.pack(pady=10)

        self.login_btn = ctk.CTkButton(self.login_box, text="Login", width=250, height=40, command=self.handle_login)
        self.login_btn.pack(pady=(20, 40))

        # Allow pressing 'Enter' to log in
        self.password_entry.bind("<Return>", lambda event: self.handle_login())

    def handle_login(self):
        username = self.username_entry.get()
        password = self.password_entry.get()

        if not username or not password:
            messagebox.showwarning("Input Error", "Please enter both username and password.")
            return

        success, user_data = verify_login(username, password)
        
        if success:
            # We found the user, transition to the billing screen!
            self.controller.show_billing_screen(user_data)
        else:
            messagebox.showerror("Access Denied", "Invalid username or password.")