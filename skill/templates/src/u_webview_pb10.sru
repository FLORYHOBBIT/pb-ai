$PBExportHeader$u_webview.sru
forward
global type u_webview from userobject
end type
end forward

global type u_webview from userobject
integer width = 1874
integer height = 1020
long backcolor = 16777215
string text = "none"
event ue_resize pbm_size
event onmessage pbm_custom01
event onpbevent ( string id,  string req,  unsignedlong arg )
event navigationcompleted ( )
end type
global u_webview u_webview

type prototypes
FUNCTION ulong satwv_create(ulong hparent) LIBRARY "satwebview.dll"
SubRoutine satwv_destroy(ulong w) LIBRARY "satwebview.dll"
SubRoutine satwv_navigate(ulong w, string url) LIBRARY "satwebview.dll" alias for "satwv_navigate;Ansi"
SubRoutine satwv_eval(ulong w, string js) LIBRARY "satwebview.dll" alias for "satwv_eval;Ansi"
FUNCTION String satwv_execute_js(ulong w, string js) LIBRARY "satwebview.dll" alias for "satwv_execute_js;Ansi"
FUNCTION String satwv_string(ulong h, long offset) LIBRARY "satwebview.dll" ALIAS FOR "satwv_get_pointer;Ansi"
SubRoutine satwv_return(ulong w, string id, long status, string result) LIBRARY "satwebview.dll" alias for "satwv_return;Ansi"
SubRoutine satwv_resize(ulong w) LIBRARY "satwebview.dll"
SubRoutine satwv_bind(ulong w, string name, ulong msg, ulong arg) LIBRARY "satwebview.dll" alias for "satwv_bind;Ansi"
SubRoutine satwv_unbind(ulong w, string name) LIBRARY "satwebview.dll" alias for "satwv_unbind;Ansi"
SubRoutine satwv_open_devtools(ulong w) LIBRARY "satwebview.dll"
FUNCTION long SetProcessDpiAwarenessContext(long dpiContext) LIBRARY "user32.dll"
FUNCTION long GetDpiForWindow(long hwnd) LIBRARY "user32.dll"
end prototypes

type variables
private:
ulong il_w = 0
end variables

forward prototypes
public subroutine of_navigate (readonly string as_url)
public subroutine of_opendevtools ()
public subroutine of_eval (string as_js)
public function string of_executejs (string as_js)
public subroutine of_return (string id, long status, string args)
end prototypes

event ue_resize;
  if il_w > 0 then satwv_resize(il_w)
end event

event onmessage;
  String id, name, req
  id = satwv_string(wparam,0)
  name = satwv_string(wparam,4)
  req = satwv_string(wparam,8)
  if name = '_OnPBEvent' then
    trigger event OnPBEvent(id,req,lparam)
  elseif name = 'NavigationCompleted' then
    trigger event NavigationCompleted()
  end if
end event

event onpbevent(string id, string req, unsignedlong arg);
  satwv_return(il_w, id, 0, '{"d1":100}')
end event

event navigationcompleted();
end event

public subroutine of_navigate (readonly string as_url);
  if il_w > 0 then satwv_navigate(il_w, as_url)
end subroutine

public subroutine of_opendevtools ();
  if il_w > 0 then satwv_open_devtools(il_w)
end subroutine

public subroutine of_eval (string as_js);
  if il_w > 0 then satwv_eval(il_w, as_js)
end subroutine

public function string of_executejs (string as_js);
  if il_w > 0 then return satwv_execute_js(il_w, as_js)
end function

public subroutine of_return (string id, long status, string args);
  satwv_return(il_w, id, status, args)
end subroutine

event constructor;
  il_w = satwv_create(handle(this))
end event

event destructor;
  if il_w > 0 then
    satwv_destroy(il_w)
    il_w = 0
  end if
end event


