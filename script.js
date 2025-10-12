const descriptionName = document.getElementById('description');
const amountInput = document.getElementById('amount');
const addBtn = document.getElementById('addBtn');
const transactionList = document.getElementById('transactionList');
const balance = document.getElementById('balance');

let totalBalance = 0;

addBtn.addEventListener('click', () => {
    const description = descriptionName.value.trim();
    const amountNumber = Number(amountInput.value);

    if (!description || isNaN(amountNumber)) {
        alert('Please enter a valid transaction and amount');
        return;
    }

    const li = document.createElement('li');
    li.textContent = `${description}: $${amountNumber}`;

    if (amountNumber < 0) {
        li.style.color = 'red';
    } else if (amountNumber > 0) {
        li.style.color = 'green';
    }

    transactionList.append(li);

    totalBalance += amountNumber;
    balance.textContent = totalBalance;

    descriptionName.value = '';
    amountInput.value = '';
});

document.addEventListener('keydown', () => {
    if (event.key === 'Enter') {
        addBtn.click();
    }
})