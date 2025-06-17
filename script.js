function handleCredentialResponse(response) {
    // Pour une application réelle, vous enverriez ce jeton à votre backend
    // pour vérification et pour créer une session utilisateur.
    // Ici, nous allons simplement décoder le jeton côté client à des fins de démonstration.
    const responsePayload = parseJwt(response.credential);

    console.log("ID: " + responsePayload.sub);
    console.log('Full Name: ' + responsePayload.name);
    console.log('Given Name: ' + responsePayload.given_name);
    console.log('Family Name: ' + responsePayload.family_name);
    console.log("Image URL: " + responsePayload.picture);
    console.log("Email: " + responsePayload.email);

    // Stocker l'état de connexion
    sessionStorage.setItem('userLoggedIn', 'true');

    // Mettre à jour l'interface
    updateUI();
}

function parseJwt (token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
}

function signOut() {
    sessionStorage.removeItem('userLoggedIn');
    // Note : La nouvelle API Google Identity Services ne propose pas de méthode de déconnexion programmatique
    // comme l'ancienne API. La gestion de l'état de connexion est laissée à l'application.
    // Nous simulons la déconnexion en supprimant notre indicateur de session.
    updateUI();
}

function updateUI() {
    const loggedIn = sessionStorage.getItem('userLoggedIn') === 'true';
    const authContainer = document.getElementById('auth-container');
    const contentContainer = document.getElementById('content-container');

    if (loggedIn) {
        authContainer.style.display = 'none';
        contentContainer.style.display = 'block';
    } else {
        authContainer.style.display = 'block';
        contentContainer.style.display = 'none';
    }
}

window.onload = () => {
    updateUI();
    const signOutButton = document.getElementById('signout-button');
    if (signOutButton) {
        signOutButton.addEventListener('click', signOut);
    }
};
