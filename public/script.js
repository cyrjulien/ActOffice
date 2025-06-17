// --- ÉLÉMENTS DU DOM ---
let userNameElement, userPictureElement, signOutButton, adminLink, homeLink, mainContentElement;

// --- INITIALISATION ---
window.onload = () => {
    // Récupérer les éléments du DOM
    userNameElement = document.getElementById('user-name');
    userPictureElement = document.getElementById('user-picture');
    signOutButton = document.getElementById('signout-button');
    adminLink = document.getElementById('admin-link');
    homeLink = document.getElementById('home-link');
    mainContentElement = document.getElementById('main-content');

    // Attacher les écouteurs d'événements
    signOutButton.addEventListener('click', (e) => {
        e.preventDefault();
        signOut();
    });
    adminLink.addEventListener('click', (e) => {
        e.preventDefault();
        displayAdminView(1); // Afficher la première page
    });
    homeLink.addEventListener('click', (e) => {
        e.preventDefault();
        displayHomepageView();
    });

    updateUI();
};

// --- AUTHENTIFICATION ---
async function handleCredentialResponse(response) {
    try {
        const res = await fetch('/api/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: response.credential }),
        });

        if (!res.ok) {
            throw new Error('Authentication failed');
        }

        const user = await res.json();

        // Stocker les informations de l'utilisateur
        sessionStorage.setItem('user', JSON.stringify(user));
        
        updateUI();
        displayHomepageView();

    } catch (error) {
        console.error('Error during authentication:', error);
    }
}

function signOut() {
    sessionStorage.removeItem('user');
    google.accounts.id.disableAutoSelect();
    updateUI();
}

// --- MISE À JOUR DE L'INTERFACE ---
function updateUI() {
    const userString = sessionStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    if (user) {
        document.body.classList.remove('logged-out');
        document.body.classList.add('logged-in');
        userNameElement.innerText = user.name;
        userPictureElement.src = user.picture || '';
        if (user.isAdmin) {
            adminLink.style.display = 'block';
        } else {
            adminLink.style.display = 'none';
        }
    } else {
        document.body.classList.remove('logged-in');
        document.body.classList.add('logged-out');
        adminLink.style.display = 'none';
    }
}

// --- VUES ---
function displayHomepageView() {
    mainContentElement.innerHTML = `
        <h1>Bienvenue sur le portail</h1>
        <p>Voici les informations statiques accessibles après authentification.</p>
    `;
    document.querySelector('#home-link a').classList.add('active');
    document.querySelector('#admin-link a').classList.remove('active');
}

async function displayAdminView(page = 1) {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user || !user.isAdmin) return;

    try {
        const res = await fetch(`/api/users?adminEmail=${user.email}&page=${page}&limit=10`);
        if (!res.ok) throw new Error('Failed to fetch users');
        
        const { users, totalPages, currentPage } = await res.json();
        
        let tableHtml = `
            <h1>Administration - Liste des utilisateurs</h1>
            <table class="table table-striped table-hover">
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Nom</th>
                        <th>Date de création</th>
                    </tr>
                </thead>
                <tbody>
        `;
        users.forEach(u => {
            tableHtml += `
                <tr>
                    <td>${u.email}</td>
                    <td>${u.name}</td>
                    <td>${new Date(u.createdAt).toLocaleString()}</td>
                </tr>
            `;
        });
        tableHtml += '</tbody></table>';

        // Ajout des contrôles de pagination
        let paginationHtml = `<nav><ul class="pagination">`;
        if (currentPage > 1) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="displayAdminView(${currentPage - 1})">Précédent</a></li>`;
        }
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#" onclick="displayAdminView(${i})">${i}</a></li>`;
        }
        if (currentPage < totalPages) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="displayAdminView(${currentPage + 1})">Suivant</a></li>`;
        }
        paginationHtml += `</ul></nav>`;

        mainContentElement.innerHTML = tableHtml + paginationHtml;
        document.querySelector('#home-link a').classList.remove('active');
        document.querySelector('#admin-link a').classList.add('active');

    } catch (error) {
        mainContentElement.innerHTML = `<p class="text-danger">Erreur lors du chargement des utilisateurs.</p>`;
        console.error('Failed to display admin view:', error);
    }
}
