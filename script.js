const button = document.getElementById("messageButton");
const message = document.getElementById("message");

button.addEventListener("click", function () {
    message.textContent = "Congratulations! JavaScript is working!";
});

document.getElementById("year").textContent =
    new Date().getFullYear();
