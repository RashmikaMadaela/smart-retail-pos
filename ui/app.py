import customtkinter as ctk
from ui.login_view import LoginView
from ui.billing_view import BillingView

# Set the overall theme for the app
ctk.set_appearance_mode("System")  # Adapts to Windows/Mac dark or light mode
ctk.set_default_color_theme("blue")

class POSApplication(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        # Main Window Settings
        self.title("Smart Retail POS")
        self.geometry("1024x768") # Standard POS tablet resolution
        self.minsize(800, 600)

        # The container is the empty canvas where we load different views
        self.container = ctk.CTkFrame(self)
        self.container.pack(side="top", fill="both", expand=True)
        self.container.grid_rowconfigure(0, weight=1)
        self.container.grid_columnconfigure(0, weight=1)

        # Start by showing the login screen
        self.show_login()

    def show_login(self):
        # Clear anything currently on the screen
        for widget in self.container.winfo_children():
            widget.destroy()
            
        # Load the Login View
        login_frame = LoginView(self.container, self)
        login_frame.grid(row=0, column=0, sticky="nsew")

    def show_billing_screen(self, user_data):
        # Clear the login screen
        for widget in self.container.winfo_children():
            widget.destroy()
            
        # Load the Billing View and pass the user_data to it
        billing_frame = BillingView(self.container, self, user_data)
        billing_frame.pack(fill="both", expand=True)