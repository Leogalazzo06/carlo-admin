import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCZSkqpGlv-gzeBH10VfJ1cpEavjUV0MAM",
    authDomain: "carlo-xavi.firebaseapp.com",
    projectId: "carlo-xavi",
    storageBucket: "carlo-xavi.firebasestorage.app",
    messagingSenderId: "1092306113916",
    appId: "1:1092306113916:web:f66b8e9e72548c723300f9"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

let productos = [];
let productosFiltrados = [];

// --- AUTH GUARD ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    } else {
        cargarProductos();
    }
});


// --- CARGA ---
async function cargarProductos() {
    toggleLoader(true);
    try {
        const querySnapshot = await getDocs(collection(db, "products"));
        productos = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        aplicarFiltros();
    } catch (e) {
        console.error("Error Carlo Essential Admin:", e);
    } finally {
        toggleLoader(false);
    }
}

function aplicarFiltros() {
    const texto = document.getElementById('admin-buscador').value.toLowerCase();
    productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(texto));
    
    document.getElementById('stats-text').innerText = `${productosFiltrados.length} piezas en exhibición`;
    renderAdmin();
}

document.getElementById('admin-buscador').addEventListener('input', aplicarFiltros);

// --- RENDER ---
function renderAdmin() {
    const container = document.getElementById("admin-productos");
    container.innerHTML = productosFiltrados.map(p => `
        <div class="bg-[#0a0a0a] rounded-3xl p-4 border border-white/5 group hover:border-[#d4af37] transition-all">
            <div class="aspect-square rounded-2xl overflow-hidden mb-4 bg-black relative">
                <img src="${p.imagenes[0]}" class="w-full h-full object-cover group-hover:scale-110 transition-transform">
                ${!p.disponible ? '<span class="absolute top-2 left-2 bg-black text-white text-[8px] px-2 py-1 rounded-full uppercase">Sin Stock</span>' : ''}
            </div>
            <h3 class="font-luxury italic text-sm text-white truncate">${p.nombre}</h3>
            <p class="text-[#d4af37] font-bold text-xs mt-1">$${Number(p.precio).toLocaleString()}</p>
            
            <div class="flex gap-2 mt-4">
                <button onclick="editarProducto('${p.id}')" class="flex-1 bg-white/5 py-2 rounded-xl text-[9px] uppercase font-bold hover:bg-[#d4af37] hover:text-black transition-all">Editar</button>
                <button onclick="eliminarProducto('${p.id}')" class="w-10 bg-red-900/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    <i class="fa-solid fa-trash-can text-xs"></i>
                </button>
            </div>
        </div>
    `).join("");
}

// --- ACCIONES ---
window.abrirModalCrear = () => {
    document.getElementById("modal-form").classList.remove("hidden");
    limpiarForm();
};

window.cerrarModalAdmin = () => {
    document.getElementById("modal-form").classList.add("hidden");
};

window.guardarProducto = async () => {
    const id = document.getElementById("edit-id").value;
    const btn = document.getElementById("btn-guardar");

    // Capturar imágenes
    const imgs = [];
    for(let i=1; i<=6; i++) {
        const val = document.getElementById(`img${i}`)?.value;
        if(val) imgs.push(val);
    }

    const datos = {
        nombre: document.getElementById("nombre").value,
        precio: Number(document.getElementById("precio").value),
        categoria: document.getElementById("categoria").value,
        descripcion: document.getElementById("descripcion").value,
        caracteristicas: document.getElementById("caracteristicas").value,
        disponible: document.getElementById("disponible").checked,
        imagenes: imgs,
        fecha: Date.now()
    };

    // Loader
    btn.disabled = true;
    btn.classList.add("btn-loading");
    btn.querySelector(".btn-text").textContent = id ? "Actualizando..." : "Guardando...";

    try {
        if(id) {
            await updateDoc(doc(db, "products", id), datos);
        } else {
            await addDoc(collection(db, "products"), datos);
        }
        cerrarModalAdmin();
        cargarProductos();
    } catch(e) {
        alert("Error al guardar en Carlo Essential");
    } finally {
        btn.disabled = false;
        btn.classList.remove("btn-loading");
        btn.querySelector(".btn-text").textContent = "Guardar producto";
    }
};

window.editarProducto = (id) => {
    const p = productos.find(x => x.id === id);
    if(!p) return;
    
    document.getElementById("edit-id").value = p.id;
    document.getElementById("nombre").value = p.nombre;
    document.getElementById("precio").value = p.precio;
    document.getElementById("categoria").value = p.categoria;
    document.getElementById("descripcion").value = p.descripcion || "";
    document.getElementById("caracteristicas").value = p.caracteristicas || "";
    document.getElementById("disponible").checked = p.disponible !== false;

    // Cargar imágenes en los previews
    p.imagenes.forEach((url, i) => {
        const inp = document.getElementById(`img${i+1}`);
        const pre = document.getElementById(`preview-${i+1}`);
        if(inp && pre) {
            inp.value = url;
            pre.src = url;
            pre.classList.remove('hidden');
        }
    });

    document.getElementById("modal-form").classList.remove("hidden");
};

window.eliminarProducto = (id) => {
    const p = productos.find(x => x.id === id);
    if(!p) return;

    document.getElementById("eliminar-nombre").textContent = p.nombre;
    abrirModalConfirm("modal-eliminar");

    const btn = document.getElementById("btn-confirm-eliminar");
    // Clonar para limpiar listeners anteriores
    const btnClone = btn.cloneNode(true);
    btn.parentNode.replaceChild(btnClone, btnClone.previousSibling ? btnClone : btn);
    document.getElementById("btn-confirm-eliminar").replaceWith(btnClone);

    btnClone.addEventListener("click", async () => {
        btnClone.disabled = true;
        btnClone.classList.add("btn-loading");
        try {
            await deleteDoc(doc(db, "products", id));
            cerrarModalConfirm("modal-eliminar");
            cargarProductos();
        } catch(e) {
            alert("Error al eliminar");
        } finally {
            btnClone.disabled = false;
            btnClone.classList.remove("btn-loading");
        }
    });
};

// --- LOGOUT ---
document.getElementById('btn-logout').addEventListener('click', () => {
    abrirModalConfirm("modal-logout");
});

document.getElementById('btn-confirm-logout').addEventListener('click', async () => {
    const btn = document.getElementById("btn-confirm-logout");
    btn.disabled = true;
    btn.classList.add("btn-loading");
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch(e) {
        btn.disabled = false;
        btn.classList.remove("btn-loading");
    }
});

function toggleLoader(show) {
    document.getElementById("loader").classList.toggle("hidden", !show);
    document.getElementById("admin-productos").classList.toggle("hidden", show);
}

function limpiarForm() {
    document.getElementById("edit-id").value = "";
    document.getElementById("nombre").value = "";
    document.getElementById("precio").value = "";
    document.getElementById("descripcion").value = "";
    document.getElementById("caracteristicas").value = "";
    document.getElementById("disponible").checked = true;
    // Resetear imágenes
    for(let i=1; i<=6; i++) {
        const inp = document.getElementById(`img${i}`);
        const pre = document.getElementById(`preview-${i}`);
        const zone = document.getElementById(`zone-${i}`);
        if(inp) inp.value = "";
        if(pre) { pre.classList.add('hidden'); pre.src = ""; }
        if(zone) zone.classList.remove('has-image');
    }
}