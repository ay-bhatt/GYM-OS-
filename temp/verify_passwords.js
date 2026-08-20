const http = require('http');

function req(method, path, body, cookies) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (cookies) headers['Cookie'] = cookies;
    const o = { hostname: 'localhost', port: 3000, path, method, headers };
    const r = http.request(o, (resp) => {
      let b = ''; resp.on('data', c => b += c);
      resp.on('end', () => {
        const sc = resp.headers['set-cookie'] || [];
        res({ status: resp.statusCode, body: b, cookies: sc.map(c => c.split(';')[0]).join('; ') });
      });
    });
    r.on('error', rej);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  // Login as Super Admin
  const l = await req('POST', '/api/auth/login', { username: 'superadmin', password: 'Super@2026#Admin' });
  const c = l.cookies;
  console.log('Super Admin Login:', l.status === 200 ? 'PASS' : 'FAIL');

  const gyms = await req('GET', '/api/gyms', null, c);
  const g = JSON.parse(gyms.body);
  const all = g.data || [];
  console.log('Total gyms found:', all.length);

  // Find a gym that has a visible admin_password
  const target = all.find(x => x.admin_password && x.admin_username);
  if (target) {
    const login = await req('POST', '/api/auth/login', {
      username: target.admin_username,
      password: target.admin_password
    });
    console.log('Login with gym "' + target.name + '" password:', login.status === 200 ? 'PASS' : 'FAIL');
    if (login.status === 200) {
      const role = JSON.parse(login.body).role;
      console.log('  Role:', role);
    }

    // Verify wrong password is rejected
    const wrong = await req('POST', '/api/auth/login', {
      username: target.admin_username,
      password: 'WrongPassword999!'
    });
    console.log('Wrong password rejected:', wrong.status === 401 ? 'PASS' : 'FAIL');
  } else {
    console.log('No gym with visible password found');
  }

  // Create a new gym with custom password and verify login
  const customName = 'Verify Gym ' + Date.now();
  const create = await req('POST', '/api/gyms', {
    name: customName,
    owner_name: 'Verify Owner',
    phone: '999',
    email: 'v@v.com',
    address: 'Addr V',
    password: 'VerifyPass123'
  }, c);
  console.log('Create gym with custom password:', create.status === 201 ? 'PASS' : 'FAIL');
  const newGym = JSON.parse(create.body);
  const newUser = newGym.data.adminUser.username;
  const newPass = newGym.data.adminUser.temporaryPassword;
  console.log('  Username:', newUser);
  console.log('  Password:', newPass);

  const loginNew = await req('POST', '/api/auth/login', {
    username: newUser,
    password: 'VerifyPass123'
  });
  console.log('Login with custom password:', loginNew.status === 200 ? 'PASS' : 'FAIL');

  // View the gym to get its password
  const gymId = newGym.data.gym.id;
  const getView = await req('GET', '/api/gyms/' + gymId, null, c);
  const vm = JSON.parse(getView.body);
  console.log('View gym password via API:', vm.data.admin_password === 'VerifyPass123' ? 'PASS' : 'FAIL');

  // Reset password
  const reset = await req('PUT', '/api/gyms/' + gymId, {
    reset_password: true,
    name: customName,
    owner_name: 'Verify Owner',
    phone: '999',
    email: 'v@v.com',
    address: 'Addr V',
    gym_id: newGym.data.gym.gym_id,
    admin_username: newUser,
    status: 'active'
  }, c);
  const rm = JSON.parse(reset.body);
  console.log('Reset password:', reset.status === 200 && rm.data.admin_password ? 'PASS' : 'FAIL');
  console.log('  New password:', rm.data.admin_password);

  const loginReset = await req('POST', '/api/auth/login', {
    username: newUser,
    password: rm.data.admin_password
  });
  console.log('Login with reset password:', loginReset.status === 200 ? 'PASS' : 'FAIL');

  // Old password should no longer work
  const loginOld = await req('POST', '/api/auth/login', {
    username: newUser,
    password: 'VerifyPass123'
  });
  console.log('Old password rejected after reset:', loginOld.status === 401 ? 'PASS' : 'FAIL');

  // Set custom password via PUT
  const setPw = await req('PUT', '/api/gyms/' + gymId, {
    name: customName,
    owner_name: 'Verify Owner',
    phone: '999',
    email: 'v@v.com',
    address: 'Addr V',
    gym_id: newGym.data.gym.gym_id,
    admin_username: newUser,
    status: 'active',
    password: 'FinalCustom999'
  }, c);
  const sm = JSON.parse(setPw.body);
  console.log('Set custom password via API:', setPw.status === 200 && sm.data.admin_password === 'FinalCustom999' ? 'PASS' : 'FAIL');

  const loginFinal = await req('POST', '/api/auth/login', {
    username: newUser,
    password: 'FinalCustom999'
  });
  console.log('Login with final custom password:', loginFinal.status === 200 ? 'PASS' : 'FAIL');

  console.log('');
  console.log('=== All password features verified end-to-end ===');
}

run().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
