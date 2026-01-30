import { useState } from 'react';
import { FolderIcon, PanelLeftCloseIcon, PanelLeftIcon, LayersIcon, SplitIcon, ImageIcon, ChevronRightIcon, UploadIcon, CheckIcon, SettingsIcon, InfoIcon, PipetteIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ThemeToggle } from './ThemeToggle';
import { NewComparisonDialog } from './NewComparisonDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const bgOptions = [
  { id: 'default', label: 'Default', className: 'bg-background' },
  { id: 'black', label: 'Black', className: 'bg-black' },
  { id: 'white', label: 'White', className: 'bg-white' },
  { id: 'checked', label: 'Checked', className: 'bg-checked' },
  { id: 'grey', label: 'Grey', className: 'bg-neutral-500' },
  { id: 'bordered', label: 'Bordered', className: 'bg-black border-[24px] border-white' },
];

function BgOption({ option, isSelected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(option.id)}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left",
        isSelected && "bg-muted"
      )}
    >
      <div className={cn(
        "w-5 h-5 rounded border border-border shrink-0",
        option.id === 'checked' && "bg-checked",
        option.id === 'default' && "bg-background",
        option.id === 'black' && "bg-black",
        option.id === 'white' && "bg-white",
        option.id === 'grey' && "bg-neutral-500",
        option.id === 'bordered' && "bg-black border-2 border-white",
      )} />
      <span className="flex-1">{option.label}</span>
      {isSelected && <CheckIcon className="w-4 h-4 text-primary" />}
    </button>
  );
}

export function AppSidebar({
  folders,
  folderImages,
  localComparisons,
  currentFolder,
  onFolderSelect,
  loading,
  theme,
  onThemeToggle,
  viewMode,
  onViewModeChange,
  onNewComparison,
  bgOption,
  onBgOptionChange,
  showToolbar,
  onShowToolbarChange,
  colorPickerEnabled,
  onColorPickerToggle,
  sliderVisible,
  onSliderVisibleToggle,
}) {
  const { toggleSidebar, open } = useSidebar();
  const [openFolders, setOpenFolders] = useState({});

  const toggleFolder = (folder) => {
    setOpenFolders(prev => ({
      ...prev,
      [folder]: !prev[folder]
    }));
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border h-screen">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarGroupLabel>Viewer</SidebarGroupLabel>
        <div className="flex flex-col gap-1 px-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
          <Collapsible open={openFolders['slider-bg']} onOpenChange={() => toggleFolder('slider-bg')}>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange('slider')}
                className={cn(
                  "justify-start gap-2 h-8 px-2 flex-1 cursor-pointer group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
                  viewMode === 'slider' && "bg-accent"
                )}
              >
                <SplitIcon className="h-4 w-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">Slider</span>
              </Button>
              <button
                onClick={onSliderVisibleToggle}
                className={cn(
                  "h-8 w-8 flex items-center justify-center hover:bg-muted rounded group-data-[collapsible=icon]:hidden",
                  !sliderVisible && "opacity-50"
                )}
                title={sliderVisible ? "Single image mode (hold 2 for B)" : "Comparison mode"}
              >
                {sliderVisible ? (
                  <EyeIcon className="h-4 w-4 shrink-0" />
                ) : (
                  <EyeOffIcon className="h-4 w-4 shrink-0" />
                )}
              </button>
              <CollapsibleTrigger asChild>
                <button className="h-8 w-8 flex items-center justify-center hover:bg-muted rounded group-data-[collapsible=icon]:hidden">
                  <SettingsIcon className="h-4 w-4 shrink-0" />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="pl-6 pr-2 py-1 flex flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                {bgOptions.map(option => (
                  <BgOption
                    key={option.id}
                    option={option}
                    isSelected={bgOption === option.id}
                    onSelect={onBgOptionChange}
                  />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewModeChange('jeri')}
            className={cn(
              "justify-start gap-2 h-8 px-2 w-full cursor-pointer group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
              viewMode === 'jeri' && "bg-accent"
            )}
          >
            <LayersIcon className="h-4 w-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">JERI</span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <SidebarGroup>
          <div className="px-2 pt-2 pb-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <NewComparisonDialog onCreated={onNewComparison} />
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <>
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                  <SidebarMenuSkeleton />
                </>
              ) : (
                <>
                  {/* Server folders */}
                  {folders.map((folder, index) => (
                    <Collapsible
                      key={folder}
                      open={openFolders[folder]}
                      onOpenChange={() => toggleFolder(folder)}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={currentFolder === folder}
                          onClick={() => onFolderSelect(folder)}
                          className="cursor-pointer"
                          tooltip={folder}
                        >
                          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <ChevronRightIcon className={cn(
                              "h-4 w-4 shrink-0 transition-transform cursor-pointer hover:text-foreground group-data-[collapsible=icon]:hidden",
                              openFolders[folder] && "rotate-90"
                            )} />
                          </CollapsibleTrigger>
                          <span className="hidden group-data-[collapsible=icon]:inline text-xs font-medium w-4 text-center">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="group-data-[collapsible=icon]:hidden">{folder}</span>
                        </SidebarMenuButton>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {folderImages[folder]?.map((image) => (
                              <SidebarMenuSubItem key={image.name}>
                                <SidebarMenuSubButton className="cursor-default">
                                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                  <span>{image.name}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                            {(!folderImages[folder] || folderImages[folder].length === 0) && (
                              <SidebarMenuSubItem>
                                <span className="text-xs text-muted-foreground px-2 py-1">
                                  No images found
                                </span>
                              </SidebarMenuSubItem>
                            )}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}

                  {/* Local comparisons (uploaded) */}
                  {localComparisons.map((comp, index) => (
                    <Collapsible
                      key={comp.id}
                      open={openFolders[comp.id]}
                      onOpenChange={() => toggleFolder(comp.id)}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={currentFolder === comp.id}
                          onClick={() => onFolderSelect(comp.id)}
                          className="cursor-pointer"
                          tooltip={comp.name}
                        >
                          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <ChevronRightIcon className={cn(
                              "h-4 w-4 shrink-0 transition-transform cursor-pointer hover:text-foreground group-data-[collapsible=icon]:hidden",
                              openFolders[comp.id] && "rotate-90"
                            )} />
                          </CollapsibleTrigger>
                          <span className="hidden group-data-[collapsible=icon]:inline text-xs font-medium w-4 text-center">
                            {String.fromCharCode(65 + folders.length + index)}
                          </span>
                          <UploadIcon className="h-3 w-3 text-muted-foreground shrink-0 group-data-[collapsible=icon]:hidden" />
                          <span className="group-data-[collapsible=icon]:hidden">{comp.name}</span>
                        </SidebarMenuButton>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton className="cursor-default">
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                <span>{comp.images.A.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton className="cursor-default">
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                                <span>{comp.images.B.name}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ))}

                  {folders.length === 0 && localComparisons.length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground italic group-data-[collapsible=icon]:hidden">
                      No comparisons yet
                    </div>
                  )}
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="flex items-center justify-between px-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:items-center">
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Settings</span>
          <div className="flex items-center gap-1 group-data-[collapsible=icon]:flex-col">
            <ThemeToggle theme={theme} onToggle={onThemeToggle} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onShowToolbarChange(!showToolbar)}
              className={cn("h-8 w-8 cursor-pointer", !showToolbar && "opacity-50")}
              title={showToolbar ? "Hide info toolbar" : "Show info toolbar"}
            >
              <InfoIcon className="h-4 w-4" />
              <span className="sr-only">Toggle info toolbar</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onColorPickerToggle}
              className={cn("h-8 w-8 cursor-pointer", !colorPickerEnabled && "opacity-50")}
              title={colorPickerEnabled ? "Disable color picker" : "Enable color picker"}
            >
              <PipetteIcon className="h-4 w-4" />
              <span className="sr-only">Toggle color picker</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 cursor-pointer"
            >
              {open ? (
                <PanelLeftCloseIcon className="h-4 w-4" />
              ) : (
                <PanelLeftIcon className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
