document.addEventListener("DOMContentLoaded", function () {

// Display the current year in the footer.
const yearElement = document.getElementById("year");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

// Display a devotional message when the button is clicked.
const messageButton = document.getElementById("messageButton");
const messageElement = document.getElementById("message");

if (messageButton && messageElement) {
    messageButton.addEventListener("click", function () {
        messageElement.textContent =
            "🙏 Jai Shri Ram! May peace, courage, and righteousness " +
            "always guide your life. 🙏";
    });
}

// Show the back-to-top button when scrolling down.
const backToTopButton = document.getElementById("backToTop");

if (backToTopButton) {

    window.addEventListener("scroll", function () {

        if (window.scrollY > 300) {
            backToTopButton.classList.add("visible");
        } else {
            backToTopButton.classList.remove("visible");
        }

    });

    backToTopButton.addEventListener("click", function () {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
}


});
