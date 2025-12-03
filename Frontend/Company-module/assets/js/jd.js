import { getStoredData, setStoredData, STORAGE_KEYS, refreshCandidateMatches } from './data.js';
import API from '../../../config/api-endpoint.js';
import { logout } from '../../../src/utils/router.js';

function setupJDManagement() {
  const jdForm = document.querySelector("#jdForm");
  const jdList = document.querySelector("#jdList");
  const uploadBtn = document.querySelector("#jdUploadBtn");
  const uploadInput = document.querySelector("#jdUploadInput");

  if (!jdForm || !jdList) return;

  const getToken = () => sessionStorage.getItem('companyAuthToken');

  const showMessage = (msg, type = 'info') => {
    // Simple alert for now, or implement a toast if available
    alert(msg);
  };

  const fetchJDs = async () => {
    const token = getToken();
    if (!token) {
      logout();
      return;
    }

    try {
      const response = await fetch(API.company.jds.getAll, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 401) logout();
        throw new Error('Failed to fetch JDs');
      }

      const jds = await response.json();
      renderJDs(jds);
    } catch (error) {
      console.error(error);
      jdList.innerHTML = `<div class="error-state">Failed to load job descriptions.</div>`;
    }
  };

  const renderJDs = (jds) => {
    if (!jds.length) {
      jdList.innerHTML = `<div class="empty-state"><strong>No job descriptions yet.</strong> Add one using the form above.</div>`;
      return;
    }

    jdList.innerHTML = jds
      .map(
        (jd) => `
        <article class="jd-card" data-id="${jd.id}">
          <div>
            <h3>${jd.title}</h3>
            <div class="chip-group">
              <span class="pill">${jd.department || 'General'}</span>
              <span class="pill">${jd.location || 'Remote'}</span>
              <span class="pill">Created ${new Date(jd.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <p>${jd.description || ''}</p>
          <div>
            <strong>Keywords:</strong>
            <div class="chip-group">
              ${(jd.keywords || []).map((kw) => `<span class="tag">${kw}</span>`).join("")}
            </div>
          </div>
          <div class="jd-actions">
            <button class="btn btn-outline" data-action="edit">Edit</button>
            <button class="btn btn-danger" data-action="delete">Delete</button>
          </div>
        </article>
      `
      )
      .join("");
  };

  // Initial Load
  fetchJDs();

  jdForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(jdForm);
    const jdId = formData.get("jdId");

    const payload = {
      title: formData.get("title"),
      department: formData.get("department"),
      location: formData.get("location"),
      description: formData.get("description"),
      keywords: formData.get("keywords").split(",").map((kw) => kw.trim()).filter(Boolean)
    };

    const token = getToken();
    if (!token) return;

    try {
      let response;
      if (jdId) {
        // Update
        response = await fetch(API.company.jds.update(jdId), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Create
        response = await fetch(API.company.jds.create, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) throw new Error('Failed to save JD');

      showMessage(jdId ? 'JD updated successfully' : 'JD created successfully', 'success');
      jdForm.reset();
      jdForm.querySelector("[name='jdId']").value = "";
      fetchJDs(); // Refresh list

      // Trigger match refresh if needed (optional, depends on backend logic)
      // if (jdId) refreshCandidateMatches(jdId); 

    } catch (error) {
      console.error(error);
      showMessage('Error saving JD', 'error');
    }
  });

  jdForm.addEventListener("reset", () => {
    setTimeout(() => jdForm.querySelector("[name='jdId']").value = "", 0);
  });

  jdList.addEventListener("click", async (event) => {
    const action = event.target.dataset.action;
    const card = event.target.closest(".jd-card");
    if (!action || !card) return;
    const jdId = card.dataset.id;
    const token = getToken();

    if (action === "edit") {
      try {
        const response = await fetch(API.company.jds.get(jdId), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch JD details');
        const jd = await response.json();

        jdForm.querySelector("[name='jdId']").value = jd.id;
        jdForm.querySelector("[name='title']").value = jd.title;
        jdForm.querySelector("[name='department']").value = jd.department || '';
        jdForm.querySelector("[name='location']").value = jd.location || '';
        jdForm.querySelector("[name='keywords']").value = (jd.keywords || []).join(", ");
        jdForm.querySelector("[name='description']").value = jd.description || '';
        jdForm.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error(error);
        showMessage('Error loading JD for edit', 'error');
      }
    }

    if (action === "delete") {
      if (!confirm('Are you sure you want to delete this JD?')) return;

      try {
        const response = await fetch(API.company.jds.delete(jdId), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete JD');

        showMessage('JD deleted successfully', 'success');
        fetchJDs();
      } catch (error) {
        console.error(error);
        showMessage('Error deleting JD', 'error');
      }
    }
  });

  if (uploadBtn && uploadInput) {
    uploadBtn.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", (event) => {
      if (!event.target.files.length) return;
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        jdForm.querySelector("[name='description']").value = reader.result;
      };
      reader.readAsText(file);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!document.body.classList.contains("jd-page")) return;
  setupJDManagement();
});

